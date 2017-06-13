import _ from 'lodash';
import uuid from 'uuid';
import config from '../config/env';
import { IntegrationAccessError, SubscriberOrgNotExistError } from './errors';
import { clientId, exchangeAuthorizationCodeForAccessToken, getUserInfo } from '../integrations/box';
import { boxIntegrationCreated } from './messaging';
import { getSubscriberUsersByUserIdAndSubscriberOrgId, updateItemCompletely } from './queries';

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
            const redirectUri = encodeURIComponent(`${config.apiEndpoint}/integrations/box/access`);
            const boxUri = `https://account.box.com/api/oauth2/authorize?response_type=code&client_id=${clientId}&state=${state}&redirect_uri=${redirectUri}`;
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
               getUserInfo(integrationInfo.accessToken)
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
            const boxInfo = {
               box: integrationInfo
            };
            updateInfo = _.merge(subscriberUsers[0].subscriberUserInfo, { integrations: boxInfo });

            return updateItemCompletely(req, -1, `${config.tablePrefix}subscriberUsers`, 'subscriberUserId', subscriberUserId, { subscriberUserInfo: updateInfo });
         })
         .then(() => {
            boxIntegrationCreated(req, updateInfo);

            resolve();
         })
         .catch(err => reject(err));
   });
}
