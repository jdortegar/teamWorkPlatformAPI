import _ from 'lodash';
import axios from 'axios';
import config from '../config/env'
import { IntegrationAccessError, SubscriberOrgNotExistError } from './errors';
import { composeAuthorizationUrl, exchangeAuthorizationCodeForAccessToken, getUserInfo, revokeIntegration } from '../integrations/onedrive';
import { integrationsUpdated } from './messaging';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';

const defaultExpiration = 5 * 60; // 5 minutes.

const hashKey = (state) => {
    return `${state}#onedriveIntegrationState`;
};

const deduceState = (req) => {
    let ipAddress = req.headers['x-forwarded-for'];
    const ipAddresses = ipAddress.split(', ');
    ipAddress = (ipAddresses.length > 1) ? ipAddresses[0] : ipAddress;
    const userAgent = req.headers['user-agent'];
    return `${ipAddress}_${userAgent}`;
};

const createRedisOnedriveIntegrationState = (req, userId, subscriberOrgId) => {
    return new Promise((resolve, reject) => {
        const state = deduceState(req);
        req.app.locals.redis.hmsetAsync(hashKey(state),
            'userId', userId,
            'subscriberOrgId', subscriberOrgId,
            'EX', defaultExpiration)
            .then(() => resolve(state))
            .catch(err => reject(err));
    });
};

const deleteRedisOnedriveIntegrationState = (req) => {
    return new Promise((resolve, reject) => {
        const state = deduceState(req);
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
            .catch((err) => {
                req.logger.debug('AD: redis get failed');
                req.logger.error(err);
                reject(err);
            });
    });
};


export const integrateOnedrive = (req, userId, subscriberOrgId) => {
    return new Promise((resolve, reject) => {
        subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
            .then((subscriberUser) => {
                if (!subscriberUser) {
                    throw new SubscriberOrgNotExistError(subscriberOrgId);
                }

                return createRedisOnedriveIntegrationState(req, userId, subscriberOrgId);
            })
            .then(() => {
                const onedriveUri = composeAuthorizationUrl();
                resolve(onedriveUri);
            })
            .catch(err => reject(err));
    });
};

export const onedriveAccessResponse = (req, { code, error, error_description }) => {
    return new Promise((resolve, reject) => {
        let integrationInfo;
        let userId;
        let subscriberOrgId;
        let updateInfo;

        deleteRedisOnedriveIntegrationState(req)
            .then((integrationContext) => {
                userId = integrationContext.userId;
                subscriberOrgId = integrationContext.subscriberOrgId;

                if (error) {
                    throw new IntegrationAccessError(`${error}: ${error_description}`); // eslint-disable-line camelcase
                }

                return exchangeAuthorizationCodeForAccessToken(req, code);
            })
            .then((tokenInfo) => {
                req.logger.debug(`OneDrive access info for userId=${userId}/subscriberOrgId=${subscriberOrgId} = ${JSON.stringify(tokenInfo)}`);
                integrationInfo = tokenInfo;
                return Promise.all([
                    subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId),
                    getUserInfo(req, integrationInfo.access_token)
                ]);
            })
            .then(([subscriberUser, userInfo]) => {
                if (!subscriberUser) {
                    throw new SubscriberOrgNotExistError(subscriberOrgId);
                }

                const subscriberUserId = subscriberUser.subscriberUserId;
                integrationInfo.userId = userInfo.id;
                integrationInfo.expired = false;
                const onedriveInfo = {
                    onedrive: integrationInfo
                };
                updateInfo = _.merge(subscriberUser, { integrations: onedriveInfo });
                delete updateInfo.integrations.onedrive.revoked;
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

                integrationError.subscriberOrgId = subscriberOrgId;
                reject(integrationError);
            });
    });
};

export const revokeOnedrive = async (req, userId, subscriberOrgId) => {
    try {
        const teamLevel = typeof req.query.teamLevel !== 'undefined' && req.query.teamLevel == 1;
        userId = req.query.userId || userId;
        let subscriber;
    
        if (teamLevel) {
    
            subscriber = await teamMembersTable.getTeamMemberByTeamIdAndUserId(req, subscriberId, userId);
    
        }  else {
            subscriber = await subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberId);
        }
        if (!subscriber) {
            throw new SubscriberOrgNotExistError(subscriberId);
        }
        const { integrations } = subscriber;
        //
        const { integrations } = subscriber;
        const userAccessToken = (subscriber.integrations && subscriber.integrations.onedrive) ? 
            subscriber.integrations.onedrive.access_token : undefined;
        if (!userAccessToken) {
            throw new IntegrationAccessError('Onedrive integration deoesn\'t exist.');
        }
        integrations.onedrive = { revoked: true };
        let subscriberInfo;
        const revokeData = {
            subscriberOrgId: subscriber.subscriberOrgId,
            hablaUserId: userId,
            source: 'onedrive',
            subscriberUserId: null,
            teamId: null
        };
    
        if (teamLevel) {
            revokeData.teamId = subscriber.teamId;
            subscriberInfo = teamMembersTable.updateTeamMembersIntegrations(req, userId, subscriberId, integrations);
        } else {
            revokeData.subscriberUserId = subscriber.subscriberUserId;
            subscriberInfo = await subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriber.subscriberUserId, integrations);
        }
        await axios.post(`${config.knowledgeApiEndpoint}/revoke/user`, revokeData);
        await revokeIntegration(req, userAccessToken);
        integrationsUpdated(req, subscriberInfo);
    } catch (err) {
        Promise.reject(err);
    }
};
