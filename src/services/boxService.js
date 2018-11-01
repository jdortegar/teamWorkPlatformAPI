import _ from 'lodash';
import uuid from 'uuid';
import { IntegrationAccessError, SubscriberOrgNotExistError } from './errors';
import { composeAuthorizationUrl, exchangeAuthorizationCodeForAccessToken, getUserInfo, revokeIntegration, validateWebhookMessage } from '../integrations/box';
import { integrationsUpdated, boxWebhookEvent } from './messaging';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';
import * as subscriberOrgsTable from '../repositories/db/subscriberOrgsTable';
import * as teamMembersTable from '../repositories/db/teamMembersTable';

const defaultExpiration = 30 * 60; // 30 minutes.

const hashKey = (state) => {
   return `${state}#boxIntegrationState`;
};

const createRedisBoxIntegrationState = async (req, userId, subscriberOrgId, teamLevel) => { // eslint-disable-line no-unused-vars
    const state = uuid.v4();
    const subscriberField = (teamLevel == 1) ? 'teamId' : 'subscriberOrgId';
    await req.app.locals.redis.setAsync(`${hashKey(state)}#teamLevel`, teamLevel, 'EX', defaultExpiration);
    await req.app.locals.redis.hmsetAsync(hashKey(state), 'userId', userId, subscriberField, subscriberOrgId, 'EX', defaultExpiration);
    return state;
};

const deleteRedisBoxIntegrationState = async (req, state, teamLevel) => {
    const subscriberField = (teamLevel == 1) ? 'teamId' : 'subscriberOrgId';
    const redisResponse = await req.app.locals.redis.hmgetAsync(hashKey(state), 'userId', subscriberField);
    const userId = redisResponse[0];
    const subscriberOrgId = redisResponse[1];
    if (userId === null || subscriberOrgId === null) {
        throw new IntegrationAccessError(subscriberOrgId,'No Oauth 2 state found.');
    }
    req.app.locals.redis.delAsync(hashKey(state));
    req.app.locals.redis.delAsync(`${hashKey(state)}#teamLevel`);
    const result = { userId };
    result[subscriberField] = subscriberOrgId;
    return result;    
};

export const integrateBox = async (req, userId, subscriberOrgId) => {
    let subscriber;
    const teamLevelVal = req.query.teamLevel || 0;
    if (typeof req.query.teamLevel !== 'undefined' && req.query.teamLevel == 1) {
        subscriber = await teamMembersTable.getTeamMemberByTeamIdAndUserId(req, subscriberOrgId, userId);
    } else {
        subscriber = await subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId);
    }
    if (!subscriber) {
        throw new SubscriberOrgNotExistError(subscriberOrgId);
    }
    const state = await createRedisBoxIntegrationState(req, userId, subscriberOrgId, teamLevelVal);
    return composeAuthorizationUrl(state);
};

export const boxAccessResponse = async (req, { code, state, error, error_description }) => {
    if (error) {
        throw new IntegrationAccessError(error);
    }
    const teamLevelVal = await req.app.locals.redis.getAsync(`${hashKey(state)}#teamLevel`) || 0;
    const teamLevel = teamLevelVal == 1;
    const authorizationCode = code;
    const integrationContext = await deleteRedisBoxIntegrationState(req, state, teamLevelVal);
    const userId = integrationContext.userId;
    const subscriberOrgId = (typeof integrationContext.subscriberOrgId !== 'undefined') ? integrationContext.subscriberOrgId : integrationContext.teamId;
    const tokenInfo = await exchangeAuthorizationCodeForAccessToken(authorizationCode);

    req.logger.debug(`Box access info for userId:${userId} = ${JSON.stringify(tokenInfo)}`);
    let subscriber;
    if (teamLevel) {
        subscriber = await teamMembersTable.getTeamMemberByTeamIdAndUserId(req, subscriberOrgId, userId);
    
    } else {
        subscriber = await subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId);
    }
    const userInfo = await getUserInfo(req, tokenInfo.access_token);

    if (!subscriber) {
        throw new SubscriberOrgNotExistError(subscriberOrgId);
    }
    tokenInfo.userId = userInfo.id;
    tokenInfo.expired = false;
    const boxInfo = {
        box: tokenInfo
    };
    const updateInfo = _.merge(subscriber, { integrations: boxInfo });
    delete updateInfo.integrations.box.revoked;
    const integrations = updateInfo.integrations;
    if (teamLevel) {
        await teamMembersTable.updateTeamMembersIntegrations(req, userId, subscriberOrgId, integrations);

    } else {
        await subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriber.subscriberUserId, integrations);
    }
    integrationsUpdated(req, updateInfo);
    return subscriberOrgId;        
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

export const getSubscriberUsersAndOrgsByBoxUserId = (req, boxUserId) => {
   return new Promise((resolve, reject) => {
      let subscriberUsers;
      subscriberUsersTable.getSubscriberUserByIntegrationsBoxUserId(req, boxUserId)
         .then((retrievedSubscriberUsers) => {
            subscriberUsers = retrievedSubscriberUsers;
            if (subscriberUsers.length === 0) {
               resolve([]);
            }

            const subscriberOrgIds = subscriberUsers.map(subscriberUser => subscriberUser.subscriberOrgId);
            return subscriberOrgsTable.getSubscriberOrgsBySubscriberOrgIds(req, subscriberOrgIds);
         })
         .then((subscriberOrgs) => {
            let i = -1;
            resolve(subscriberOrgs.map((subscriberOrg) => {
               i += 1;
               return { subscriberOrg, subscriberUser: subscriberUsers[i] };
            }));
         })
         .catch(err => reject(err));
   });
};

export const webhookEvent = (req) => {
   validateWebhookMessage(req);
   boxWebhookEvent(req, req.body);
   return Promise.resolve();
};
