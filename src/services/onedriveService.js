import _ from 'lodash';
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

export const revokeOnedrive = (req, userId, subscriberOrgId) => {
   return new Promise((resolve, reject) => {
      subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
         .then((subscriberUser) => {
            if (!subscriberUser) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            const { subscriberUserId, integrations } = subscriberUser;
            const userAccessToken = ((subscriberUser.integrations) && (subscriberUser.integrations.onedrive)) ? subscriberUser.integrations.onedrive.access_token : undefined;
            const promises = [];

            if (userAccessToken) {
               integrations.onedrive = { revoked: true };
               promises.push(subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriberUserId, integrations));
               promises.push(revokeIntegration(req, userAccessToken));
            } else {
               throw new IntegrationAccessError('OneDrive integration doesn\'t exist.');
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

