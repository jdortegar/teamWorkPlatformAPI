import _ from 'lodash';
import uuid from 'uuid';
import config from '../config/env';
import { NoPermissionsError, SubscriberOrgExistsError, SubscriberOrgNotExistError, UserNotExistError } from './errors';
import { inviteExistingUsersToSubscriberOrg, inviteExternalUsersToSubscriberOrg } from './invitations';
import { subscriberOrgCreated, subscriberOrgPrivateInfoUpdated, subscriberOrgUpdated } from './messaging';
import Roles from './roles';
import teamSvc from './teamService';
import {
   createItem,
   getSubscriberOrgsByIds,
   getSubscriberOrgsByName,
   getSubscriberUsersBySubscriberOrgId,
   getSubscriberUsersByUserIdAndSubscriberOrgIdAndRole,
   getSubscriberUsersByUserIds,
   getUsersByEmailAddresses,
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
         let dbSubscriberOrg;
         getSubscriberOrgsByIds(req, [subscriberOrgId])
            .then((subscriberOrgs) => {
               if (subscriberOrgs.length === 0) {
                  throw new SubscriberOrgNotExistError(subscriberOrgId);
               }

               return getSubscriberUsersByUserIdAndSubscriberOrgIdAndRole(req, userId, subscriberOrgId, Roles.admin);
            })
            .then((subscriberUsers) => {
               if (subscriberUsers.length === 0) {
                  throw new NoPermissionsError(subscriberOrgId);
               }

               updateItem(req, -1, `${config.tablePrefix}subscriberOrgs`, 'subscriberOrgId', subscriberOrgId, { subscriberOrgInfo: updateInfo });
            })
            .then(() => {
               resolve();

               const subscriberOrg = dbSubscriberOrg.subscriberOrgInfo;
               _.merge(subscriberOrg, updateInfo); // Eventual consistency, so might be old.
               subscriberOrg.subscriberOrgId = subscriberOrgId;
               subscriberOrgUpdated(req, subscriberOrg);
               if ((updateInfo.preferences) && (updateInfo.preferences.private)) {
                  subscriberOrgPrivateInfoUpdated(req, subscriberOrg);
               }
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
      const userIdsRoles = {};

      return new Promise((resolve, reject) => {
         getSubscriberUsersBySubscriberOrgId(req, subscriberOrgId)
            .then((subscriberUsers) => {
               if (subscriberUsers.length === 0) {
                  throw new SubscriberOrgNotExistError(subscriberOrgId);
               }

               const userIds = subscriberUsers.map((subscriberUser) => {
                  userIdsRoles[subscriberUser.subscriberUserInfo.userId] = subscriberUser.subscriberUserInfo.role;
                  return subscriberUser.subscriberUserInfo.userId;
               });
               if ((userId) && (userIds.indexOf(userId)) < 0) {
                  throw new NoPermissionsError(subscriberOrgId);
               }

               return getUsersByIds(req, userIds);
            })
            .then((users) => {
               const usersWithRoles = users.map((user) => {
                  const ret = _.cloneDeep(user);
                  ret.userInfo.role = userIdsRoles[user.userId];
                  return ret;
               });
               resolve(usersWithRoles);
            })
            .catch(err => reject(err));
      });
   }

   inviteSubscribers(req, subscriberOrgId, subscriberUserIdEmails, userId) {
      return new Promise((resolve, reject) => {
         const userIds = new Set();
         const emails = new Set();

         Promise.all([
            getSubscriberOrgsByIds(req, [subscriberOrgId]),
            getSubscriberUsersByUserIdAndSubscriberOrgIdAndRole(req, userId, subscriberOrgId, Roles.admin)
         ])
            .then((promiseResults) => {
               const subscriberOrgs = promiseResults[0];
               const subscriberUsers = promiseResults[1];

               if (subscriberOrgs.length === 0) {
                  throw new SubscriberOrgNotExistError(subscriberOrgId);
               }

               if (subscriberUsers.length === 0) {
                  throw new NoPermissionsError(subscriberOrgId);
               }

               subscriberUserIdEmails.forEach((userIdOrEmail) => {
                  if (userIdOrEmail.indexOf('@') >= 0) {
                     emails.add(userIdOrEmail);
                  } else {
                     userIds.add(userIdOrEmail);
                  }
               });

               // See who we already have in the system.
               return Promise.all([
                  getUsersByIds(req, [userId, ...userIds]),
                  getUsersByEmailAddresses(req, [...emails]),
                  Promise.resolve(subscriberOrgs[0])
               ]);
            })
            .then((promiseResults) => {
               const dbUser = promiseResults[0][0];
               let existingDbUsers = promiseResults[0];
               existingDbUsers.splice(0, 1);
               const retrievedUsersByEmail = promiseResults[1];
               const subscriberOrg = promiseResults[2];

               // If any of the userIds are bad, fail.
               if (existingDbUsers.length !== userIds.size) {
                  throw new UserNotExistError();
               }

               // Convert any found emails to existing users.
               if (retrievedUsersByEmail.length > 0) {
                  retrievedUsersByEmail.forEach((user) => {
                     existingDbUsers.push(user);
                     emails.delete(user.userInfo.emailAddress);
                  });
               }

               // Remove duplicates.
               existingDbUsers = existingDbUsers.reduce((prevList, existingDbUser) => {
                  if (prevList.indexOf(existingDbUser) < 0) {
                     prevList.push(existingDbUser);
                  } else {
                     emails.delete(existingDbUser.emailAddress);
                  }
                  return prevList;
               }, []);

               return Promise.all([
                  inviteExistingUsersToSubscriberOrg(req, dbUser, existingDbUsers, subscriberOrg),
                  inviteExternalUsersToSubscriberOrg(req, dbUser, emails, subscriberOrg)
               ]);
            })
            .then(() => resolve())
            .catch(err => reject(err));
      });
   }
}

const subscriberOrgService = new SubscriberOrgService();
export default subscriberOrgService;
