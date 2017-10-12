import _ from 'lodash';
import uuid from 'uuid';
import config from '../config/env';
import { IntegrationAccessError, SubscriberOrgNotExistError } from './errors';
import { composeAuthorizationUrl, exchangeAuthorizationCodeForAccessToken, getUserInfo, revokeIntegration, validateWebhookMessage } from '../integrations/box';
import { boxIntegrationCreated, boxIntegrationRevoked, boxWebhookEvent } from './messaging';
import { getSubscriberUsersByUserIdAndSubscriberOrgId, updateItemCompletely } from '../repositories/util';

const defaultExpiration = 30 * 60; // 30 minutes.

function hashKey(state) {
   return `${state}#boxIntegrationState`;
}

function createRedisBoxIntegrationState(req, userId, subscriberOrgId) {
   return new Promise((resolve, reject) => {
      const state = uuid.v4();
      req.app.locals.redis.hmsetAsync(hashKey(state), 'userId', userId, 'subscriberOrgId', subscriberOrgId, 'EX', defaultExpiration)
         .then(() => resolve(state))
         .catch(err => reject(err));
   });
}

function deleteRedisBoxIntegrationState(req, state) {
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
}


export function integrateBox(req, userId, subscriberOrgId) {
   return new Promise((resolve, reject) => {
      getSubscriberUsersByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
         .then((subscriberUsers) => {
            if (subscriberUsers.length === 0) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            return createRedisBoxIntegrationState(req, userId, subscriberOrgId);
         })
         .then((state) => {
            const boxUri = composeAuthorizationUrl(state);
            resolve(boxUri);
         })
         .catch(err => reject(err));
   });
}

export function boxAccessResponse(req, { code, state, error, error_description }) {
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
               getSubscriberUsersByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId),
               getUserInfo(req, integrationInfo.accessToken)
            ]);
         })
         .then((promiseResults) => {
            const subscriberUsers = promiseResults[0];
            const userInfo = promiseResults[1];
            if (subscriberUsers.length === 0) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            const { subscriberUserId } = subscriberUsers[0];
            integrationInfo.userId = userInfo.id;
            integrationInfo.expired = false;
            const boxInfo = {
               box: integrationInfo
            };
            updateInfo = _.merge(subscriberUsers[0].subscriberUserInfo, { integrations: boxInfo });
            delete updateInfo.integrations.box.revoked;

            return updateItemCompletely(req, -1, `${config.tablePrefix}subscriberUsers`, 'subscriberUserId', subscriberUserId, { subscriberUserInfo: updateInfo });
         })
         .then(() => {
            // Only have box integration info.
            const event = {
               userId: { updateInfo },
               subscriberOrgId: { updateInfo },
               integrations: {
                  google: updateInfo.integrations.box
               }
            };

            boxIntegrationCreated(req, event);
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
}

export function revokeBox(req, userId, subscriberOrgId) {
   return new Promise((resolve, reject) => {
      let subscriberUserInfo;
      getSubscriberUsersByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
         .then((subscriberUsers) => {
            if (subscriberUsers.length === 0) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            const { subscriberUserId } = subscriberUsers[0];
            subscriberUserInfo = _.cloneDeep(subscriberUsers[0].subscriberUserInfo);
            const userAccessToken = ((subscriberUserInfo.integrations) && (subscriberUserInfo.integrations.box)) ? subscriberUserInfo.integrations.box.accessToken : undefined;
            const promises = [];

            if (userAccessToken) {
               subscriberUserInfo.integrations.box = { revoked: true };
               promises.push(updateItemCompletely(req, -1, `${config.tablePrefix}subscriberUsers`, 'subscriberUserId', subscriberUserId, { subscriberUserInfo }));
               promises.push(revokeIntegration(req, userAccessToken));
            } else {
               throw new IntegrationAccessError('Box integration doesn\'t exist.');
            }
            return Promise.all(promises);
         })
         .then(() => {
            resolve();
            boxIntegrationRevoked(req, subscriberUserInfo);
         })
         .catch(err => reject(err));
   });
}

export function webhookEvent(req) {
   validateWebhookMessage(req);
   boxWebhookEvent(req, req.body);
   return Promise.resolve();
}
