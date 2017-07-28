import _ from 'lodash';
import uuid from 'uuid';
import config from '../config/env';
import { IntegrationAccessError, SubscriberOrgNotExistError } from './errors';
import { composeAuthorizationUrl, exchangeAuthorizationCodeForAccessToken, getUserInfo, validateWebhookMessage } from '../integrations/google';
import { googleIntegrationCreated, googleWebhookEvent } from './messaging';
import { getSubscriberUsersByUserIdAndSubscriberOrgId, updateItemCompletely } from './queries';

const defaultExpiration = 30 * 60; // 30 minutes.

function hashKey(state) {
   return `${state}#googleIntegrationState`;
}

function createRedisGoogleIntegrationState(req, userId, subscriberOrgId) {
   return new Promise((resolve, reject) => {
      const state = uuid.v4();
      req.app.locals.redis.hmsetAsync(hashKey(state), 'userId', userId, 'subscriberOrgId', subscriberOrgId, 'EX', defaultExpiration)
         .then(() => resolve(state))
         .catch(err => reject(err));
   });
}

function deleteRedisGoogleIntegrationState(req, state) {
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


export function integrateGoogle(req, userId, subscriberOrgId) {
   return new Promise((resolve, reject) => {
      getSubscriberUsersByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
         .then((subscriberUsers) => {
            if (subscriberUsers.length === 0) {
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
}

export function googleAccessResponse(req, { code, state, error }) {
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
               getSubscriberUsersByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId),
               getUserInfo(req, integrationInfo.access_token)
            ]);
         })
         .then((promiseResults) => {
            req.logger.info('AD: 100');
            const subscriberUsers = promiseResults[0];
            req.logger.info('AD: 101');
            const userInfo = promiseResults[1];
            req.logger.info('AD: 102');
            if (subscriberUsers.length === 0) {
               req.logger.info('AD: 103');
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }
            req.logger.info('AD: 104');

            const { subscriberUserId } = subscriberUsers[0];
            req.logger.info('AD: 105');
            integrationInfo.userId = userInfo.id;
            integrationInfo.expired = false;
            const googleInfo = {
               google: integrationInfo
            };
            req.logger.info('AD: 106');
            updateInfo = _.merge(subscriberUsers[0].subscriberUserInfo, { integrations: googleInfo });

            req.logger.info('AD: 107');
            return updateItemCompletely(req, -1, `${config.tablePrefix}subscriberUsers`, 'subscriberUserId', subscriberUserId, { subscriberUserInfo: updateInfo });
         })
         .then(() => {
            req.logger.info('AD: 108');
            // Only have google integration info.
            const event = {
               userId: { updateInfo },
               subscriberOrgId: { updateInfo },
               integrations: {
                  google: updateInfo.integrations.google
               }
            };
            req.logger.info('AD: 109');
            googleIntegrationCreated(req, event);
            req.logger.info('AD: 110');
            resolve(subscriberOrgId);
         })
         .catch(err => { req.logger.error(`AD: 100 err=${err}`); reject(err); });
   });
}

export function revokeGoogle(req, userId, subscriberOrgId) {
   return new Promise((resolve, reject) => {
      getSubscriberUsersByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
         .then((subscriberUsers) => {
            if (subscriberUsers.length === 0) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            const { subscriberUserId } = subscriberUsers[0];
            const subscriberUserInfo = _.cloneDeep(subscriberUsers[0].subscriberUserInfo);
            subscriberUserInfo.google = { revoked: true };

            return updateItemCompletely(req, -1, `${config.tablePrefix}subscriberUsers`, 'subscriberUserId', subscriberUserId, { subscriberUserInfo });
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
}

export function webhookEvent(req) {
   validateWebhookMessage(req);
   googleWebhookEvent(req, req.body);
   return Promise.resolve();
}
