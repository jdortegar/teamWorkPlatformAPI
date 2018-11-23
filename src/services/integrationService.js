import _ from 'lodash';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';
import * as teamMembersTable from '../repositories/db/teamMembersTable';
import { BadIntegrationConfigurationError, SubscriberUserNotExistError } from './errors';
import { integrationsUpdated } from './messaging';
import config from '../config/env';

export const getIntegrations = (req, userId, subscriberOrgId = undefined) => {
    return new Promise((resolve, reject) => {
        let getSubscriberUsers;
        if (subscriberOrgId) {
            getSubscriberUsers = subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId);
        } else {
            getSubscriberUsers = subscriberUsersTable.getSubscriberUsersByUserId(req, userId);
        }

        getSubscriberUsers
            .then((retrievedSubscriberUsers) => {
                const subscriberUsers = (retrievedSubscriberUsers instanceof Array) ? retrievedSubscriberUsers : [retrievedSubscriberUsers];
                const integrations = [];
                subscriberUsers.forEach((subscriberUser) => {
                    if (subscriberUser.integrations) {
                        const orgIntegrations = _.cloneDeep(subscriberUser.integrations);
                        _.merge(orgIntegrations, { subscriberOrgId: subscriberUser.subscriberOrgId });
                        integrations.push(orgIntegrations);
                    }
                });
                resolve(integrations);
            })
            .catch(err => reject(err));
    });
};

export const configureIntegration = async (req, userId, subscriberId, target, configuration) => {
    try {
        const teamLevelVal = req.query.teamLevel || 0;
        let subscriber;
        if (teamLevelVal == 1) {
            subscriber = await teamMembersTable.getTeamMemberByTeamIdAndUserId(req, subscriberId, userId);
        } else {
            subscriber = await subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberId);
        }
        if (!subscriber) {
            throw new SubscriberUserNotExistError(`userId=${userId}, subscriberId=${subscriberId}`);
        }
        const { integrations } = subscriber;
        if (target === 'sharepoint' && configuration.sharepoint && configuration.sharepoint.sites) {
            _.merge(integrations.sharepoint.sites, configuration.sharepoint.sites);
        } else {
            throw new BadIntegrationConfigurationError(configuration);
        }

        if (teamLevel == 1) {
            await teamMembersTable.updateTeamMembersIntegrations(req, userId, teamId, integrations);
        } else {
            await subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriber.subscriberUserId, integrations);
        }
        integrationsUpdated(req, subscriber);
        return subscriber;
    } catch (err) {
        return Promise.reject(err);
    }
};
