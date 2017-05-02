import _ from 'lodash';
import uuid from 'uuid';
import config from '../config/env';
import { NoPermissionsError, SubscriberOrgExistsError, SubscriberOrgNotExistError } from './errors';
import { subscriberOrgCreated, subscriberOrgPrivateInfoUpdated, subscriberOrgUpdated } from './messaging';
import Roles from './roles';
import teamSvc from './teamService';
import {
   createItem,
   getSubscriberOrgsByIds,
   getSubscriberOrgsByName,
   getSubscriberUsersBySubscriberOrgId,
   getSubscriberUsersByUserIds,
   getUsersByIds,
   updateItem
} from './queries';


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

   createSubscriberOrgNoCheck(req, subscriberOrgInfo, userId, subscriberOrgId = undefined) {
      const actualSubscriberOrgId = subscriberOrgId || uuid.v4();
      const preferences = subscriberOrgInfo.preferences || { private: {} };
      if (preferences.private === undefined) {
         preferences.private = {};
      }
      const subscriberOrg = {
         name: subscriberOrgInfo.name,
         preferences
      };
      const subscriberUserId = uuid.v4();

      return new Promise((resolve, reject) => {
         createItem(req, -1, `${config.tablePrefix}subscriberOrgs`, 'subscriberOrgId', actualSubscriberOrgId, 'subscriberOrgInfo', subscriberOrg)
            .then(() => {
               const subscriberUser = {
                  userId,
                  subscriberOrgId: actualSubscriberOrgId,
                  role: Roles.admin
               };
               return createItem(req, -1, `${config.tablePrefix}subscriberUsers`, 'subscriberUserId', subscriberUserId, 'subscriberUserInfo', subscriberUser);
            })
            .then(() => {
               subscriberOrg.subscriberOrgId = actualSubscriberOrgId;
               subscriberOrgCreated(req, subscriberOrg, userId);
               return teamSvc.createTeamNoCheck(req, actualSubscriberOrgId, { name: 'All' }, subscriberUserId, userId);
            })
            .then(() => resolve(subscriberOrg))
            .catch(err => reject(err));
      });
   }

   createSubscriberOrg(req, subscriberOrgInfo, userId, subscriberOrgId = undefined) {
      return new Promise((resolve, reject) => {
         // TODO: if (userId), check canCreateSubscriberOrg() -> false, throw NoPermissionsError
         getSubscriberOrgsByName(req, subscriberOrgInfo.name)
            .then((existingSubscriberOrgs) => {
               if (existingSubscriberOrgs.length > 0) {
                  throw new SubscriberOrgExistsError(subscriberOrgInfo.name);
               }

               return this.createSubscriberOrgNoCheck(req, subscriberOrgInfo, userId, subscriberOrgId);
            })
            .then(subscriberOrg => resolve(subscriberOrg))
            .catch(err => reject(err));
      });
   }

   /**
    * Create a subscriber organization given the name+`appendNumber`.
    * if the name exists, append ' (n)', where n >= 1 to avoid conflict.
    *
    * @param req
    * @param subscriberOrgName
    * @param appendNumber (optional)
    */
   createSubscriberOrgUsingBaseName(req, info, userId, subscriberOrgId = undefined, appendNumber = undefined) {
      const tryInfo = {
         name: info.name + ((appendNumber) ? ` (${appendNumber})` : ''),
         preferences: info.preferences
      };
      return new Promise((resolve, reject) => {
         this.createSubscriberOrg(req, tryInfo, userId, subscriberOrgId)
            .then(createdSubscriberOrg => resolve(createdSubscriberOrg))
            .catch((err) => {
               if (err instanceof SubscriberOrgExistsError) {
                  const tryNumber = (appendNumber) ? appendNumber + 1 : 1;
                  this.createSubscriberOrgUsingBaseName(req, info, userId, subscriberOrgId, tryNumber)
                     .then(createdSubscriberOrg => resolve(createdSubscriberOrg))
                     .catch(err2 => reject(err2));
               } else {
                  reject(err);
               }
            });
      });
   }

   updateSubscriberOrg(req, subscriberOrgId, updateInfo, userId) {
      return new Promise((resolve, reject) => {
         getSubscriberUsersBySubscriberOrgId(req, subscriberOrgId)
            .then((subscriberUsers) => {
               const userIds = subscriberUsers.map(subscriberUser => subscriberUser.subscriberUserInfo.userId);
               if (userIds.indexOf(userId) < 0) {
                  throw new NoPermissionsError(subscriberOrgId);
               }
               updateItem(req, -1, `${config.tablePrefix}subscriberOrgs`, 'subscriberOrgId', subscriberOrgId, { subscriberOrgInfo: updateInfo });
            })
            .then(() => getSubscriberOrgsByIds(req, [subscriberOrgId]))
            .then((subscriberOrgs) => {
               resolve();

               const subscriberOrg = subscriberOrgs[0].subscriberOrgInfo;
               _.merge(subscriberOrg, updateInfo); // Eventual consistency, so might be old.
               subscriberOrg.subscriberOrgId = subscriberOrgId;
               subscriberOrgUpdated(req, subscriberOrg);
               if ((updateInfo.preferences) && (updateInfo.preferences.private)) {
                  subscriberOrgPrivateInfoUpdated(req, subscriberOrg);
               }
            })
            .catch((err) => {
               if (err.code === 'ValidationException') {
                  reject(new SubscriberOrgNotExistError(subscriberOrgId));
               } else {
                  reject(err);
               }
            });
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
