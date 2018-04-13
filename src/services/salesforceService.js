import _ from 'lodash';
import uuid from 'uuid';
import { IntegrationAccessError, SubscriberOrgNotExistError } from './errors';
import { composeAuthorizationUrl, exchangeAuthorizationCodeForAccessToken, revokeIntegration } from '../integrations/salesforce';
import { integrationsUpdated } from './messaging';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';

const defaultExpiration = 30 * 60; // 30 minutes.

const hashKey = (state) => {
   return `${state}#salesforceIntegrationState`;
};

const createRedisSalesforceIntegrationState = (req, userId, subscriberOrgId) => {
   return new Promise((resolve, reject) => {
      const state = uuid.v4();
      req.app.locals.redis.hmsetAsync(hashKey(state), 'userId', userId, 'subscriberOrgId', subscriberOrgId, 'EX', defaultExpiration)
         .then(() => resolve(state))
         .catch(err => reject(err));
   });
};

const deleteRedisSalesforceIntegrationState = (req, state) => {
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


export const integrateSalesforce = (req, userId, subscriberOrgId) => {
   return new Promise((resolve, reject) => {
      subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
         .then((subscriberUser) => {
            if (!subscriberUser) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            return createRedisSalesforceIntegrationState(req, userId, subscriberOrgId);
         })
         .then((state) => {
            const salesforceUri = composeAuthorizationUrl(state);
            resolve(salesforceUri);
         })
         .catch(err => reject(err));
   });
};

export const salesforceAccessResponse = (req, { code, state, error, error_description }) => {
   if (error) {
      return Promise.reject(new IntegrationAccessError(`${error}: ${error_description}`)); // eslint-disable-line camelcase
   }

   const authorizationCode = code;

   return new Promise((resolve, reject) => {
      let integrationInfo;
      let userId;
      let subscriberOrgId;
      let updateInfo;

      deleteRedisSalesforceIntegrationState(req, state)
         .then((integrationContext) => {
            userId = integrationContext.userId;
            subscriberOrgId = integrationContext.subscriberOrgId;

            return exchangeAuthorizationCodeForAccessToken(authorizationCode);
         })
         .then((tokenInfo) => {
            req.logger.debug(`Salesforce access info for userId=${userId}/subscriberOrgId=${subscriberOrgId} = ${JSON.stringify(tokenInfo)}`);
            integrationInfo = tokenInfo;
            return Promise.all([
               subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
            ]);
         })
         .then((subscriberUsers) => {
            if ((!subscriberUsers) || (subscriberUsers.length < 1)) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            const subscriberUser = subscriberUsers[0];
            const { subscriberUserId } = subscriberUser;
            integrationInfo.userId = integrationInfo.id;
            integrationInfo.expired = false;
            const salesforceInfo = {
               salesforce: integrationInfo
            };
            updateInfo = _.merge(subscriberUser, { integrations: salesforceInfo });
            delete updateInfo.integrations.salesforce.revoked;
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

export const revokeSalesforce = (req, userId, subscriberOrgId) => {
   return new Promise((resolve, reject) => {
      subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
         .then((subscriberUser) => {
            if (!subscriberUser) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            const { subscriberUserId, integrations } = subscriberUser;
            const userAccessToken = ((subscriberUser.integrations) && (subscriberUser.integrations.salesforce)) ? subscriberUser.integrations.salesforce.access_token : undefined;
            const promises = [];

            if (userAccessToken) {
               integrations.salesforce = { revoked: true };
               promises.push(subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriberUserId, integrations));
               promises.push(revokeIntegration(req, userAccessToken));
            } else {
               throw new IntegrationAccessError('Salesforce integration doesn\'t exist.');
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
