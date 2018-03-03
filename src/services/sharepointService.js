import _ from 'lodash';
import { IntegrationAccessError, SubscriberOrgNotExistError } from './errors';
import { composeAuthorizationUrl, exchangeAuthorizationCodeForAccessToken, getUserInfo, getSites, revokeIntegration, validateWebhookMessage } from '../integrations/sharepoint';
import { integrationsUpdated, sharepointWebhookEvent } from './messaging';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';

const defaultExpiration = 5 * 60; // 5 minutes.

const hashKey = (state) => {
   return `${state}#sharepointIntegrationState`;
};

const deduceState = (req) => {
   const ipAddress = req.headers['x-forwarded-for'];
   const userAgent = req.headers['user-agent'];
   return `${ipAddress}_${userAgent}`;
};

const createRedisSharepointIntegrationState = (req, userId, subscriberOrgId, sharepointOrg) => {
   return new Promise((resolve, reject) => {
      const state = deduceState(req);
      req.logger.debug(`AD: redis create, ${state}=${userId}, ${subscriberOrgId}, ${sharepointOrg}`);
      req.app.locals.redis.hmsetAsync(hashKey(state),
         'userId', userId,
         'subscriberOrgId', subscriberOrgId,
         'sharepointOrg', sharepointOrg,
         'EX', defaultExpiration)
         .then(() => resolve(state))
         .catch(err => reject(err));
   });
};

const deleteRedisSharepointIntegrationState = (req) => {
   return new Promise((resolve, reject) => {
      const state = deduceState(req);
      let userId;
      let subscriberOrgId;
      let sharepointOrg;

      req.logger.debug(`AD: redis get, ${state}`);
      req.app.locals.redis.hmgetAsync(hashKey(state), 'userId', 'subscriberOrgId', 'sharepointOrg')
         .then((redisResponse) => {
            userId = redisResponse[0];
            subscriberOrgId = redisResponse[1];
            sharepointOrg = redisResponse[2];
            req.logger.debug(`AD: redis get response, ${state}=${userId}, ${subscriberOrgId}, ${sharepointOrg}`);
            if ((userId === null) || (subscriberOrgId === null) || (sharepointOrg === null)) {
               throw new IntegrationAccessError('No OAuth 2 state found.');
            }

            return req.app.locals.redis.delAsync(hashKey(state));
         })
         .then(() => {
            resolve({ userId, subscriberOrgId, sharepointOrg });
         })
         .catch((err) => {
            req.logger.debug('AD: redis get failed');
            req.logger.error(err);
            reject(err);
         });
   });
};


export const integrateSharepoint = (req, userId, subscriberOrgId, sharepointOrg) => {
   return new Promise((resolve, reject) => {
      subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
         .then((subscriberUser) => {
            if (!subscriberUser) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            return createRedisSharepointIntegrationState(req, userId, subscriberOrgId, sharepointOrg);
         })
         .then(() => {
            const sharepointUri = composeAuthorizationUrl(sharepointOrg);
            resolve(sharepointUri);
         })
         .catch(err => reject(err));
   });
};

export const sharepointAccessResponse = (req, { code, error, error_description }) => {
   return new Promise((resolve, reject) => {
      let integrationInfo;
      let userId;
      let subscriberOrgId;
      let updateInfo;

      deleteRedisSharepointIntegrationState(req)
         .then((integrationContext) => {
            userId = integrationContext.userId;
            subscriberOrgId = integrationContext.subscriberOrgId;
            const { sharepointOrg } = integrationContext;

            if (error) {
               throw new IntegrationAccessError(`${error}: ${error_description}`); // eslint-disable-line camelcase
            }

            return exchangeAuthorizationCodeForAccessToken(req, code, sharepointOrg);
         })
         .then((tokenInfo) => {
            req.logger.debug(`Sharepoint access info for userId=${userId}/subscriberOrgId=${subscriberOrgId} = ${JSON.stringify(tokenInfo)}`);
            integrationInfo = tokenInfo;
            return Promise.all([
               subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId),
               getUserInfo(req, integrationInfo.sharepointOrg, integrationInfo.access_token),
               getSites(req, integrationInfo.sharepointOrg, integrationInfo.access_token)
            ]);
         })
         .then(([subscriberUser, userInfo, sites]) => {
            if (!subscriberUser) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            const { subscriberUserId } = subscriberUser;
            integrationInfo.userId = userInfo.UserId.NameId;
            integrationInfo.sites = sites.map((site) => { return { site, selected: true, sites: [] }; });
            integrationInfo.expired = false;
            const sharepointInfo = {
               sharepoint: integrationInfo
            };
            updateInfo = _.merge(subscriberUser, { integrations: sharepointInfo });
            delete updateInfo.integrations.sharepoint.revoked;
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

export const revokeSharepoint = (req, userId, subscriberOrgId) => {
   return new Promise((resolve, reject) => {
      subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
         .then((subscriberUser) => {
            if (!subscriberUser) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            const { subscriberUserId, integrations } = subscriberUser;
            const userAccessToken = ((subscriberUser.integrations) && (subscriberUser.integrations.sharepoint)) ? subscriberUser.integrations.sharepoint.access_token : undefined;
            const promises = [];

            if (userAccessToken) {
               integrations.sharepoint = { revoked: true };
               promises.push(subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriberUserId, integrations));
               promises.push(revokeIntegration(req, userAccessToken));
            } else {
               throw new IntegrationAccessError('SharePoint integration doesn\'t exist.');
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
   sharepointWebhookEvent(req, req.body);
   return Promise.resolve();
};
