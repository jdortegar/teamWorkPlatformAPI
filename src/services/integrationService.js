import _ from 'lodash';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';

export const getIntegrations = (req, userId, subscriberOrgId = undefined) => { // eslint-disable-line import/prefer-default-export
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
