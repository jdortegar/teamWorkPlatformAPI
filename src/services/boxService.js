import _ from 'lodash';
import uuid from 'uuid';
import { IntegrationAccessError, SubscriberOrgNotExistError } from './errors';
import { composeAuthorizationUrl, exchangeAuthorizationCodeForAccessToken, getUserInfo, revokeIntegration, validateWebhookMessage } from '../integrations/box';
import { integrationsUpdated, boxWebhookEvent } from './messaging';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';

const defaultExpiration = 30 * 60; // 30 minutes.

const hashKey = (state) => {
   return `${state}#boxIntegrationState`;
};

const createRedisBoxIntegrationState = (req, userId, subscriberOrgId) => { // eslint-disable-line no-unused-vars
   return new Promise((resolve, reject) => {
      const state = uuid.v4();
      req.app.locals.redis.hmsetAsync(hashKey(state), 'userId', userId, 'subscriberOrgId', subscriberOrgId, 'EX', defaultExpiration)
         .then(() => resolve(state))
         .catch(err => reject(err));
   });
};

const deleteRedisBoxIntegrationState = (req, state) => {
   return new Promise((resolve, reject) => {
      let userId;
      let subscriberOrgId;

      req.app.locals.redis.hmgetAsync(hashKey(state), 'userId', 'subscriberOrgId')
         .then((redisResponse) => {
            userId = redisResponse[0];
            subscriberOrgId = redisResponse[1];
            if ((userId === null) || (subscriberOrgId === null)) {
               throw new IntegrationAccessError(subscriberOrgId, 'No OAuth 2 state found.');
            }

            return req.app.locals.redis.delAsync(hashKey(state));
         })
         .then(() => {
            resolve({ userId, subscriberOrgId });
         })
         .catch(err => reject(err));
   });
};


export const integrateBox = (req, userId, subscriberOrgId) => {
   return new Promise((resolve, reject) => {
      subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
         .then((subscriberUser) => {
            if (!subscriberUser) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }
            // throw new IntegrationAccessError(subscriberOrgId);

            return createRedisBoxIntegrationState(req, userId, subscriberOrgId);
         })
         .then((state) => {
            const boxUri = composeAuthorizationUrl(state);
            resolve(boxUri);
         })
         .catch(err => reject(err));
   });
};

export const boxAccessResponse = (req, { code, state, error, error_description }) => {
   if (error) {
      return Promise.reject(new IntegrationAccessError(`${error}: ${error_description}`)); // eslint-disable-line camelcase
   }

   const authorizationCode = code;

   return new Promise((resolve, reject) => {
      let integrationInfo;
      let userId;
      let subscriberOrgId;
      let updateInfo;

      deleteRedisBoxIntegrationState(req, state)
         .then((integrationContext) => {
            userId = integrationContext.userId;
            subscriberOrgId = integrationContext.subscriberOrgId;

            return exchangeAuthorizationCodeForAccessToken(authorizationCode);
         })
         .then((tokenInfo) => {
            req.logger.debug(`Box access info for userId=${userId}/subscriberOrgId=${subscriberOrgId} = ${JSON.stringify(tokenInfo)}`);
            integrationInfo = tokenInfo;
            return Promise.all([
               subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId),
               getUserInfo(req, integrationInfo.accessToken)
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
            const boxInfo = {
               box: integrationInfo
            };
            updateInfo = _.merge(subscriberUser, { integrations: boxInfo });
            delete updateInfo.integrations.box.revoked;
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

export const revokeBox = (req, userId, subscriberOrgId) => {
   return new Promise((resolve, reject) => {
      subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
         .then((subscriberUser) => {
            if (!subscriberUser) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            const { subscriberUserId, integrations } = subscriberUser;
            const userAccessToken = ((subscriberUser.integrations) && (subscriberUser.integrations.box)) ? subscriberUser.integrations.box.accessToken : undefined;
            const promises = [];

            if (userAccessToken) {
               integrations.box = { revoked: true };
               promises.push(subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriberUserId, integrations));
               promises.push(revokeIntegration(req, userAccessToken));
            } else {
               throw new IntegrationAccessError('Box integration doesn\'t exist.');
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
   boxWebhookEvent(req, req.body);
   return Promise.resolve();
};
