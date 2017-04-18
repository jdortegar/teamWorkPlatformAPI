import {
   getSubscriberOrgsByIds,
   getSubscriberUsersBySubscriberOrgId,
   getSubscriberUsersByUserIds,
   getUsersByIds
} from './util';

export class SubscriberOrgNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, SubscriberOrgNotExistError);
   }
}


class SubscriberOrgService {

   getUserSubscriberOrgs(req, userId) {
      return new Promise((resolve, reject) => {
         getSubscriberUsersByUserIds(req, [userId])
            .then((subscriberUsers) => {
               const subscriberOrgIds = subscriberUsers.map(subscriberUser => subscriberUser.subscriberUserInfo.subscriberOrgId);
               return getSubscriberOrgsByIds(req, subscriberOrgIds);
            })
            .then((subscriberOrgs) => {
               // Remove partitionId.
               const retSubscriberOrgs = [];
               subscriberOrgs.forEach((subscriberOrg) => {
                  const subscriberOrgClone = JSON.parse(JSON.stringify(subscriberOrg));
                  delete subscriberOrgClone.partitionId;
                  retSubscriberOrgs.push(subscriberOrgClone);
               });
               resolve(retSubscriberOrgs);
            })
            .catch(err => reject(err));
      });
   }

   /**
    * If the subscriber org doesn't exist, a SubscriberOrgNotExistError is thrown.
    *
    * If userId is specified, an additional check is applied to confirm the user is actually a subscriber of the subscriber org.
    * If userId is specified and the user is not a subscriber of the subscriber org, a NoPermissionsError is thrown.
    *
    * @param req
    * @param subscriberOrgId
    * @param userId Optional userId to return results only if the user is a subscriber.
    * @returns {Promise}
    */
   getSubscriberOrgUsers(req, subscriberOrgId, userId = undefined) {
      return new Promise((resolve, reject) => {
         getSubscriberOrgsByIds(req, [subscriberOrgId])
            .then((subscriberOrgs) => {
               if (subscriberOrgs.length === 0) {
                  throw new SubscriberOrgNotExistError(subscriberOrgId);
               }
               return getSubscriberUsersBySubscriberOrgId(req, subscriberOrgId);
            })
            .then((subscriberUsers) => {
               if (subscriberUsers.length === 0) {
                  throw new NoPermissionsError(subscriberOrgId);
               }

               const userIds = subscriberUsers.map(subscriberUser => subscriberUser.subscriberUserInfo.userId);
               if ((userId) && (userIds.indexOf(userId)) < 0) {
                  throw new NoPermissionsError(subscriberOrgId);
               }

               return getUsersByIds(req, userIds);
            })
            .then(users => resolve(users))
            .catch(err => reject(err));
      });
   }
}

const subscriberOrgService = new SubscriberOrgService();
export default subscriberOrgService;
