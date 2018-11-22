import _ from 'lodash';
import axios from 'axios';
import { IntegrationAccessError, SubscriberOrgNotExistError } from './errors';
import { composeAuthorizationUrl, exchangeAuthorizationCodeForAccessToken, getUserInfo, getSites, revokeIntegration, validateWebhookMessage } from '../integrations/sharepoint';
import { integrationsUpdated, sharepointWebhookEvent } from './messaging';
import config from '../config/env';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';
import * as teamMembersTable from '../repositories/db/teamMembersTable';

const defaultExpiration = 5 * 60; // 5 minutes.

export const hashKey = (state) => {
    return `${state}#sharepointIntegrationState`;
};

export const deduceState = (req) => {
    let ipAddress = req.headers['x-forwarded-for'] || '127.0.0.1';
    const ipAddresses = ipAddress.split(', ');
    ipAddress = (ipAddresses.length > 1) ? ipAddresses[0] : ipAddress;
    const userAgent = req.headers['user-agent'];
    return `${ipAddress}_${userAgent}`;
};

const createRedisSharepointIntegrationState = async (req, userId, subscriberId, sharepointOrg, teamLevel) => {
    try {
        const state = deduceState(req);
        const subscriberField = (teamLevel == 1) ? 'teamId' : 'subscriberOrgId';
        await req.app.locals.redis.setAsync(`${hashKey(state)}#teamLevel`, teamLevel, 'EX', defaultExpiration);
        await req.app.locals.redis.hmsetAsync(hashKey(state), 'userId', userId, subscriberField, subscriberId, 'sharepointOrg', sharepointOrg, 'EX', defaultExpiration);
        return state;
    } catch (err) {
        return Promise.reject(err);
    }
};

const deleteRedisSharepointIntegrationState = async (req, teamLevel) => {
    try {
        const subscriberField = (teamLevel == 1) ? 'teamId' : 'subscriberOrgId';
        const state = deduceState(req);
        const redisResponse = await req.app.locals.redis.hmgetAsync(hashKey(state), 'userId', subscriberField, 'sharepointOrg');
        const userId = redisResponse[0];
        const subscriberId = redisResponse[1];
        const sharepointOrg = redisResponse[2];
        req.logger.debug(`AD: redis get response, ${state}=${userId}, ${subscriberId}, ${sharepointOrg}`);
        if (userId === null || subscriberId === null || sharepointOrg === null) {
            throw new IntegrationAccessError('No OAuth 2 state found.');
        }
        await Promise.all([
            req.app.locals.redis.delAsync(hashKey(state)),
            req.app.locals.redis.delAsync(`${hashKey(state)}#teamLevel`)
        ]);
        const result = { userId, sharepointOrg };
        result[subscriberField] = subscriberId;
        return result;
    } catch (err) {
        return Promise.reject(err);
    }
};


export const integrateSharepoint = async (req, userId, subscriberId, sharepointOrg) => {
    try {
        let subscriber;
        const teamLevelVal = req.query.teamLevel || 0;
        if (typeof req.query.teamLevel !== 'undefined' && req.query.teamLevel == 1) {
            subscriber = await teamMembersTable.getTeamMemberByTeamIdAndUserId(req, subscriberId, userId);
        } else {
            subscriber = await subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberId);
        }
        if (!subscriber) {
            throw new SubscriberOrgNotExistError(subscriberId);
        }
        await createRedisSharepointIntegrationState(req, userId, subscriberId, sharepointOrg, teamLevelVal);
        return composeAuthorizationUrl(sharepointOrg);
    } catch (err) {
        return Promise.reject(err)
    }
};

export const sharepointAccessResponse = async (req, { code, error, error_description }) => {
    try {
        if (error) {
            console.log(error);
            throw new IntegrationAccessError(error);
        }
        const teamLevelVal = await req.app.locals.redis.getAsync(`${hashKey(deduceState(req))}#teamLevel`) || 0;
        const teamLevel = teamLevelVal == 1;
        const integrationContext = await deleteRedisSharepointIntegrationState(req, teamLevelVal);
        const userId = integrationContext.userId;
        const subscriberId = (typeof integrationContext.subscriberOrgId !== 'undefined') ? integrationContext.subscriberOrgId : integrationContext.teamId;
        const { sharepointOrg } = integrationContext;
        const tokenInfo = await exchangeAuthorizationCodeForAccessToken(req, code, sharepointOrg);
        req.logger.debug(`Sharepoint access info for userId=${userId} = ${JSON.stringify(tokenInfo)}`);
        let subscriber;
        if (teamLevel) {
            subscriber = await teamMembersTable.getTeamMemberByTeamIdAndUserId(req, subscriberId, userId);
        } else {
            subscriber = await subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberId);
        }
        const userInfo = await getUserInfo(req, tokenInfo.sharepointOrg );
        const sites = await getSites(req, tokenInfo.sharepointOrg, tokenInfo.access_token);
        if (!subscriber) {
            throw new SubscriberOrgNotExistError(subscriberOrgId);
        }
        tokenInfo.userId = userInfo.UserId.NameId;
        tokenInfo.sites = sites.map((site) => { return { site, selected: false }; });
        tokenInfo.expired = false;
        const sharepointInfo = {
            sharepoint: tokenInfo
        };
        const updateInfo = _.merge(subscriber, { integrations: sharepointInfo });
        delete updateInfo.integrations.sharepoint.revoked;
        const integrations = updateInfo.integrations;
        if (teamLevel) {
            await teamMembersTable.updateTeamMembersIntegrations(req, userId, subscriberId, integrations);
    
        } else {
            await subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriber.subscriberUserId, integrations);
        }
        integrationsUpdated(req, updateInfo);
        return subscriberId;
    } catch (err) {
        return Promise.reject(err);
    }
};

export const revokeSharepoint = async (req, userId, subscriberId) => {
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
        const userAccessToken = (subscriber.integrations && subscriber.integrations.sharepoint) ? 
            subscriber.integrations.sharepoint.access_token : undefined;
        if (!userAccessToken) {
            throw new IntegrationAccessError('Sharepoint integration deoesn\'t exist.');
        }
        let subscriberInfo;
        const revokeData = {
            subscriberOrgId: subscriber.subscriberOrgId,
            hablaUserId: userId,
            source: 'sharepoint',
            subscriberUserId: null,
            teamId: null,
        }
        if (teamLevel) {
            revokeData.teamId = subscriber.teamId;
            subscriberInfo = await teamMembersTable.updateTeamMembersIntegrations(req, userId, subscriberId, integrations);
        } else {
            revokeData.subscriberUserId = subscriber.subscriberUserId;
            subscriberInfo = await subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriber.subscriberUserId, integrations);
        }
        await axios.post(`${config.knowledgeApiEndpoint}/revoke/user`, revokeData);
        await revokeIntegration(req, userAccessToken);
        integrationsUpdated(req, subscriberInfo);
    } catch (err) { 
        return Promise.reject(err);
    }
};

export const webhookEvent = (req) => {
    validateWebhookMessage(req);
    sharepointWebhookEvent(req, req.body);
    return Promise.resolve();
};
