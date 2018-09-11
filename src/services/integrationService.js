import _ from 'lodash';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';
import { BadIntegrationConfigurationError, SubscriberUserNotExistError } from './errors';
import { integrationsUpdated } from './messaging';

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

export const configureIntegration = (req, userId, subscriberOrgId, target, configuration) => {
   return new Promise((resolve, reject) => {
      subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
         .then((subscriberUser) => {
            if (!subscriberUser) {
               throw new SubscriberUserNotExistError(`userId=${userId}, subscriberOrgId=${subscriberOrgId}`);
            }

            const { subscriberUserId, integrations } = subscriberUser;
            if ((target === 'sharepoint') && (configuration.sharepoint) && (configuration.sharepoint.sites)) {
               _.merge(integrations.sharepoint.sites, configuration.sharepoint.sites);
            } else {
               throw new BadIntegrationConfigurationError(configuration);
            }

            return subscriberUsersTable.updateSubscriberUserIntegrations(req, subscriberUserId, integrations);
         })
         .then((subscriberUser) => {
            resolve(subscriberUser);
            integrationsUpdated(req, subscriberUser);
         })
         .catch(err => reject(err));
   });
};
