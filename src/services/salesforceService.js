import _ from 'lodash';
import uuid from 'uuid';
import axios from 'axios';
import config from '../config/env';
import { IntegrationAccessError, SubscriberOrgNotExistError } from './errors';
import { composeAuthorizationUrl, exchangeAuthorizationCodeForAccessToken, revokeIntegration } from '../integrations/salesforce';
import { integrationsUpdated } from './messaging';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';
import * as teamMembersTable from '../repositories/db/teamMembersTable';

const defaultExpiration = 30 * 60; // 30 minutes.

export const hashKey = (state) => {
    return `${state}#salesforceIntegrationState`;
};

const createRedisSalesforceIntegrationState = async (req, userId, subscriberOrgId, teamLevel) => {
    const state = uuid.v4();
    const subscriberField = (teamLevel == 1) ? 'teamId' : 'subscriberOrgId';
    await req.app.locals.redis.setAsync(`${hashKey(state)}#teamLevel`, teamLevel, 'EX', defaultExpiration);
    await req.app.locals.redis.hmsetAsync(hashKey(state), 'userId', userId, subscriberField, subscriberOrgId, 'EX', defaultExpiration);
    return state;
};

const deleteRedisSalesforceIntegrationState = async (req, state,teamLevel) => {
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
}

export const integrateSalesforce = async (req, userId, subscriberOrgId) => {
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
    const state = await createRedisSalesforceIntegrationState(req, userId, subscriberOrgId, teamLevelVal);
    return composeAuthorizationUrl(state);
};

export const salesforceAccessResponse = async (req, { code, state, error }) => {
    try {

        if (error) {
            throw new IntegrationAccessError(error);
        }
        const teamLevelVal = await req.app.locals.redis.getAsync(`${hashKey(state)}#teamLevel`) || 0;
        const teamLevel = teamLevelVal == 1;
        const authorizationCode = code;
        const integrationContext = await deleteRedisSalesforceIntegrationState(req, state, teamLevelVal);
        const userId = integrationContext.userId;
        const subscriberOrgId = (typeof integrationContext.subscriberOrgId !== 'undefined') ? integrationContext.subscriberOrgId : integrationContext.teamId;
        const tokenInfo = await exchangeAuthorizationCodeForAccessToken(authorizationCode);
    
        req.logger.debug(`Salesforce access info for userId:${userId} = ${JSON.stringify(tokenInfo)}`);
        let subscriber;
        if (teamLevel) {
            subscriber = await teamMembersTable.getTeamMemberByTeamIdAndUserId(req, subscriberOrgId, userId);
        
        } else {
            subscriber = await subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId);
        }
    
        if (!subscriber) {
            throw new SubscriberOrgNotExistError(subscriberOrgId);
        }
        tokenInfo.userId = tokenInfo.id;
        tokenInfo.expired = false;
        const salesforceInfo = {
            salesforce: tokenInfo
        };
        const updateInfo = _.merge(subscriber, { integrations: salesforceInfo });
        delete updateInfo.integrations.salesforce.revoked;
        const integrations = updateInfo.integrations;
        if (teamLevel) {
            await teamMembersTable.updateTeamMembersIntegrations(req, userId, subscriberOrgId, integrations);
    
        } else {
            await subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriber.subscriberUserId, integrations);
        }
        integrationsUpdated(req, updateInfo);
        return subscriberOrgId;
    } catch (err) {
        return Promise.reject(err);
    }
};

export const revokeSalesforce = async (req, userId, subscriberId) => {
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
        const userAccessToken = (subscriber.integrations && subscriber.integrations.salesforce) ?
            subscriber.integrations.salesforce.access_token : undefined;
        if (!userAccessToken) {
            throw new IntegrationAccessError('Salesforce integration doesn\`t exist.');
        }
        integrations.salesforce = { revoked: true };
        let subscriberInfo;
        const revokeData = {
            subscriberOrgId: subscriber.subscriberOrgId,
            hablaUserId: userId,
            source: 'salesforce',
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
