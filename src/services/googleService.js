import _ from 'lodash';
import uuid from 'uuid';
import { IntegrationAccessError, SubscriberOrgNotExistError } from './errors';
import { composeAuthorizationUrl, exchangeAuthorizationCodeForAccessToken, getUserInfo, revokeIntegration, validateWebhookMessage } from '../integrations/google';
import { integrationsUpdated, googleWebhookEvent } from './messaging';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';

const defaultExpiration = 30 * 60; // 30 minutes.

const hashKey = (state) => {
    return `${state}#googleIntegrationState`;
};

const createRedisGoogleIntegrationState = (req, userId, subscriberOrgId) => {
    return new Promise((resolve, reject) => {
        const state = uuid.v4();
        req.app.locals.redis.hmsetAsync(hashKey(state), 'userId', userId, 'subscriberOrgId', subscriberOrgId, 'EX', defaultExpiration)
            .then(() => resolve(state))
            .catch(err => reject(err));
    });
};

const deleteRedisGoogleIntegrationState = (req, state) => {
    return new Promise((resolve, reject) => {
        let userId;
        let subscriberOrgId;

        req.app.locals.redis.hmgetAsync(hashKey(state), 'userId', 'subscriberOrgId')
            .then((redisResponse) => {
                userId = redisResponse[0];
                subscriberOrgId = redisResponse[1];
                if ((userId === null) || (subscriberOrgId === null)) {
                    throw new IntegrationAccessError('No OAuth 2 state found.');
                }

                return req.app.locals.redis.delAsync(hashKey(state));
            })
            .then(() => {
                resolve({ userId, subscriberOrgId });
            })
            .catch(err => reject(err));
    });
};


export const integrateGoogle = (req, userId, subscriberOrgId) => {
    return new Promise((resolve, reject) => {
        subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
            .then((subscriberUser) => {
                if (!subscriberUser) {
                    throw new SubscriberOrgNotExistError(subscriberOrgId);
                }

                return createRedisGoogleIntegrationState(req, userId, subscriberOrgId);
            })
            .then((state) => {
                const googleUri = composeAuthorizationUrl(state);
                resolve(googleUri);
            })
            .catch(err => reject(err));
    });
};

export const googleAccessResponse = (req, { code, state, error }) => {
    if (error) {
        return Promise.reject(new IntegrationAccessError(error));
    }

    const authorizationCode = code;

    return new Promise((resolve, reject) => {
        let integrationInfo;
        let userId;
        let subscriberOrgId;
        let updateInfo;

        deleteRedisGoogleIntegrationState(req, state)
            .then((integrationContext) => {
                userId = integrationContext.userId;
                subscriberOrgId = integrationContext.subscriberOrgId;

                return exchangeAuthorizationCodeForAccessToken(authorizationCode);
            })
            .then((tokenInfo) => {
                req.logger.debug(`Google access info for userId=${userId}/subscriberOrgId=${subscriberOrgId} = ${JSON.stringify(tokenInfo)}`);
                integrationInfo = tokenInfo;
                return Promise.all([
                    subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId),
                    getUserInfo(req, integrationInfo.access_token)
                ]);
            })
            .then((promiseResults) => {
                const subscriberUser = promiseResults[0];
                const userInfo = promiseResults[1];
                if (!subscriberUser) {
                    throw new SubscriberOrgNotExistError(subscriberOrgId);
                }

                const { subscriberUserId } = subscriberUser;
                integrationInfo.userId = userInfo.id;
                integrationInfo.expired = false;
                const googleInfo = {
                    google: integrationInfo
                };
                updateInfo = _.merge(subscriberUser, { integrations: googleInfo });
                delete updateInfo.integrations.google.revoked;
                const integrations = updateInfo.integrations;
                return subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriberUserId, integrations);
            })
            .then(() => {
                integrationsUpdated(req, updateInfo);
                resolve(subscriberOrgId);
            })
            .catch((err) => {
                let integrationError;
                if (err instanceof IntegrationAccessError) {
                    integrationError = err;
                } else {
                    integrationError = new IntegrationAccessError();
                    integrationError._chainedError = err;
                }

                integrationError._subscriberOrgId = subscriberOrgId;
                reject(integrationError);
            });
    });
};

export const revokeGoogle = (req, userId, subscriberOrgId) => {
    return new Promise((resolve, reject) => {
        subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
            .then((subscriberUser) => {
                if (!subscriberUser) {
                    throw new SubscriberOrgNotExistError(subscriberOrgId);
                }

                const { subscriberUserId, integrations } = subscriberUser;
                const userAccessToken = ((subscriberUser.integrations) && (subscriberUser.integrations.google))
                    ? subscriberUser.integrations.google.access_token : undefined;
                const promises = [];

                if (userAccessToken) {
                    integrations.google = { revoked: true };
                    promises.push(subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriberUserId, integrations));
                    promises.push(revokeIntegration(req, userAccessToken));
                } else {
                    throw new IntegrationAccessError('Google integration doesn\'t exist.');
                }
                return Promise.all(promises);
            })
            .then(([subscriberUserInfo]) => {
                resolve();
                integrationsUpdated(req, subscriberUserInfo);
            })
            .catch(err => reject(err));
    });
};

export const webhookEvent = (req) => {
    validateWebhookMessage(req);
    googleWebhookEvent(req, req.body);
    return Promise.resolve();
};
