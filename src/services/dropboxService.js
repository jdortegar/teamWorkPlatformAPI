import _ from 'lodash';
import uuid from 'uuid';
import axios from 'axios';
import { IntegrationAccessError, SubscriberOrgNotExistError } from './errors';
import { composeAuthorizationUrl, exchangeAuthorizationCodeForAccessToken, revokeIntegration } from '../integrations/dropbox';
import { integrationsUpdated } from './messaging';
import config from '../config/env';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';
import * as teamMembersTable from '../repositories/db/teamMembersTable';

const defaultExpiration = 30 * 60; // 30 minutes

export const hashKey = (state) => {
    return `${state}#dropboxIntegrationState`;
};

const createRedisDropboxIntegrationState = async (req, userId, subscriberId, teamLevel) => {
    const state = uuid.v4();
    const subscriberFild = (teamLevel == 1) ? 'teamId' : 'subscriberOrgId';
    await req.app.locals.redis.setAsync(`${hashKey(state)}#teamLevel`, teamLevel, 'EX', defaultExpiration);
    await req.app.locals.redis.hmsetAsync(hashKey(state), 'userId', userId, subscriberFild, subscriberId, 'EX', defaultExpiration);
    return state;
};

const deleteRedisDropboxIntegrationState = async (req, state, teamLevel) => {
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

export const integrateDropbox = async (req, userId, subscriberId) => {
    let subscriber;
    const teamLevel = req.query.teamLevel || 0;
    if (teamLevel == 1) {
        subscriber = await teamMembersTable.getTeamMemberByTeamIdAndUserId(req, subscriberId, userId);
    } else {
        subscriber = await subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberId);
    }
    if (!subscriber) {
        throw new SubscriberOrgNotExistError(subscriberId);
    }
    const state = await createRedisDropboxIntegrationState(req, userId, subscriberId, teamLevel);
    return composeAuthorizationUrl(state);
};

export const dropboxAccessResponse = async (req, { code, state, error, error_description }) => {
    try {
        console.log(code, state, error, error_description);
        const teamLevelVal = await req.app.locals.redis.getAsync(`${hashKey(state)}#teamLevel`) || 0;
        const integrationContext = await deleteRedisDropboxIntegrationState(req, state, teamLevelVal);
        const subscriberField = teamLevelVal == 0 ? 'subscriberOrgId' : 'teamId';
        if (error) {
            throw new IntegrationAccessError(integrationContext[subscriberField]);    
        }
        const teamLevel = teamLevelVal == 1;
        const authorizationCode = code;
        const userId = integrationContext.userId;
        const subscriberId = (typeof integrationContext.subscriberOrgId !== 'undefined') ? integrationContext.subscriberOrgId : integrationContext.teamId;
        const tokenInfo = await exchangeAuthorizationCodeForAccessToken(authorizationCode);
        req.logger.debug(`Dropbox access info for userId:${userId} = ${JSON.stringify(tokenInfo)}`);
        let subscriber;
        if (teamLevel) {
            subscriber = await teamMembersTable.getTeamMemberByTeamIdAndUserId(req, subscriberId, userId);
        
        } else {
            subscriber = await subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberId);
        }
        if (!subscriber || subscriber.length < 1) {
            throw new SubscriberOrgNotExistError(subscriberId);
        }
        tokenInfo.userId = tokenInfo.id;
        tokenInfo.expired = false;
        const dropboxInfo = {
            dropbox: tokenInfo
        };
        const updateInfo = _.merge(subscriber, { integrations: dropboxInfo });
        delete updateInfo.integrations.dropbox.revoked;
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

export const revokeDropbox = async (req, userId, subscriberId) => {
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
        const userAccessToken = (subscriber.integrations && subscriber.integrations.dropbox) ?
            subscriber.integrations.dropbox.access_token : undefined;
        if (!userAccessToken) {
            throw new IntegrationAccessError('Dropbox integration doesn\'t exist.');
        }
        integrations.dropbox = { revoked: true };
        let subscriberInfo;
        const revokeData = {
            subscriber_org_id: subscriber.subscriberOrgId,
            habla_user_id: userId,
            service: 'dropbox',
            subscriber_user_id: null,
            team_id: null,
        }
        if (teamLevel) {
            revokeData.team_id = subscriber.teamId;
            subscriberInfo = teamMembersTable.updateTeamMembersIntegrations(req, userId, subscriberId, integrations);
        } else {
            revokeData.subscriber_user_id = subscriber.subscriberUserId;
            subscriberInfo = await subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriber.subscriberUserId, integrations);
        }
        await axios.post(`${config.knowledgeApiEndpoint}/revoke/user`, revokeData);

        await revokeIntegration(req, userAccessToken);
        integrationsUpdated(req, subscriberInfo);
    } catch (err) {
        Promise.reject(err);
    }
};
