import _ from 'lodash';
import { getSubscriberUsersByUserIdAndSubscriberOrgId, getSubscriberUsersByUserIds } from '../repositories/util';

export function getIntegrations(req, userId, subscriberOrgId = undefined) { // eslint-disable-line import/prefer-default-export
   return new Promise((resolve, reject) => {
      let getSubscriberUsers;
      if (subscriberOrgId) {
         getSubscriberUsers = getSubscriberUsersByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId);
      } else {
         getSubscriberUsers = getSubscriberUsersByUserIds(req, [userId]);
      }

      getSubscriberUsers
         .then((subscriberUsers) => {
            const integrations = [];
            subscriberUsers.forEach((subscriberUser) => {
               if (subscriberUser.subscriberUserInfo.integrations) {
                  const orgIntegrations = _.cloneDeep(subscriberUser.subscriberUserInfo.integrations);
                  _.merge(orgIntegrations, { subscriberOrgId: subscriberUser.subscriberUserInfo.subscriberOrgId });
                  integrations.push(orgIntegrations);
               }
            });
            resolve(integrations);
         })
         .catch(err => reject(err));
   });
}
