import _ from 'lodash';
import uuid from 'uuid';
import { IntegrationAccessError, SubscriberOrgNotExistError } from './errors';
import { composeAuthorizationUrl, exchangeAuthorizationCodeForAccessToken, getUserInfo, revokeIntegration, validateWebhookMessage } from '../integrations/google';
import { integrationsUpdated, googleWebhookEvent } from './messaging';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';
import * as teamMemabersTable from '../repositories/db/teamMembersTable';

const defaultExpiration = 30 * 60; // 30 minutes.

const hashKey = (state) => {
    return `${state}#googleIntegrationState`;
};

const createRedisGoogleIntegrationState = async (req, userId, subscriberId, teamLevel) => {
    const state = uuid.v4();
    const subscriberField = (teamLevel == 1) ? 'teamId' : 'subscriberOrgId';
    await req.app.locals.redis.setAsync(`${hashKey(state)}#teamLevel`, teamLevel, 'EX', defaultExpiration);
    await req.app.locals.redis.hmsetAsync(hashKey(state), 'userId', userId, subscriberField, subscriberId, 'EX', defaultExpiration);
    return state;
};

const deleteRedisGoogleIntegrationState = async (req, state, teamLevel) => {
    const subscriberField = (teamLevel == 1) ? 'teamId' : 'subscriberOrgId';
    const redisResponse = await req.app.locals.redis.hmgetAsync(hashKey(state), 'userId', subscriberField);
    const userId = redisResponse[0];
    const subscriberId = redisResponse[1];
    if (userId === null || subscriberId === null) {
        throw new IntegrationAccessError('No Oauth 2 state found.');
    }
    req.app.locals.redis.delAsync(hashKey(state));
    req.app.locals.redis.delAsync(`${hashKey(state)}#teamLevel`);
    const result = { userId };
    result[subscriberField] = subscriberId;
    return result;
};


export const integrateGoogle = async (req, userId, subscriberId) => {
    let subscriber;
    const teamLevelVal = req.query.teamLevel || 0;
    if (typeof req.query.teamLevel !== 'undefined' && req.query.teamLevel == 1) {
        subscriber = await teamMemabersTable.getTeamMemberByTeamIdAndUserId(req, subscriberId, userId);
    } else {
        subscriber = await subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberId);
    }
    if (!subscriber) {
        throw new SubscriberOrgNotExistError(subscriberId);
    }
    const state = await createRedisGoogleIntegrationState(req, userId, subscriberId, teamLevelVal);
    return composeAuthorizationUrl(state);
};

export const googleAccessResponse = async (req, { code, state, error }) => {
    if (error) {
        throw new IntegrationAccessError(error);
    }
    const teamLevelVal = await req.app.locals.redis.getAsync(`${hashKey(state)}#teamLevel`) || 0;
    const teamLevel = teamLevelVal == 1;
    const authorizationCode = code;
    const integrationContext = await deleteRedisGoogleIntegrationState(req, state, teamLevelVal);
    const userId = integrationContext.userId;
    const subscriberId = (typeof integrationContext.subscriberOrgId !== 'undefined') ? integrationContext.subscriberOrgId : integrationContext.teamId;
    const tokenInfo = await exchangeAuthorizationCodeForAccessToken(authorizationCode);

    req.logger.debug(`Google access info for userId:${userId} = ${JSON.stringify(tokenInfo)}`);
    let subscriber;
    if (teamLevel) {
        subscriber = await teamMemabersTable.getTeamMemberByTeamIdAndUserId(req, subscriberId, userId);
    
    } else {
        subscriber = await subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberId);
    }
    const userInfo = await getUserInfo(req, tokenInfo.access_token);

    if (!subscriber) {
        throw new SubscriberOrgNotExistError(subscriberId);
    }
    tokenInfo.userId = userInfo.id;
    tokenInfo.expired = false;
    const googleInfo = {
        google: tokenInfo
    };
    const updateInfo = _.merge(subscriber, { integrations: googleInfo });
    delete updateInfo.integrations.google.revoked;
    const integrations = updateInfo.integrations;
    if (teamLevel) {
        await teamMemabersTable.updateTeamMembersIntegrations(req, userId, subscriberId, integrations);
    } else {
        await subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriber.subscriberUserId, integrations);
    }
    integrationsUpdated(req, updateInfo);
    return subscriberId;
};

export const revokeGoogle = async (req, userId, subscriberId) => {
    const teamLevel = typeof req.query.teamLevel !== 'undefined' && req.query.teamLevel == 1;
    userId = req.query.userId || userId;
    let subscriber;

    if (teamLevel) {

        subscriber = await teamMemabersTable.getTeamMemberByTeamIdAndUserId(req, subscriberId, userId);

    }  else {
        subscriber = await subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberId);
    }
    if (!subscriber) {
        throw new SubscriberOrgNotExistError(subscriberId);
    }
    const { integrations } = subscriber;
    const userAccessToken = (subscriber.integrations && subscriber.integrations.google) ? 
        subscriber.integrations.google.access_token : undefined;
    if (!userAccessToken) {
        throw new IntegrationAccessError('Google integration deoesn\'t exist.');
    }
    integrations.google = { revoked: true };
    let subscriberInfo;
    if (teamLevel) {
        subscriberInfo = teamMemabersTable.updateTeamMembersIntegrations(req, userId, subscriberId, integrations);
    } else {
        subscriberInfo = await subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriber.subscriberUserId, integrations);
    }
    
    await revokeIntegration(req, userAccessToken);
    integrationsUpdated(req, subscriberInfo);        
};

export const webhookEvent = (req) => {
    validateWebhookMessage(req);
    googleWebhookEvent(req, req.body);
    return Promise.resolve();
};
