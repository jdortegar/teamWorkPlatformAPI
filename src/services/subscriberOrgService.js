import _ from 'lodash';
import uuid from 'uuid';
import config from '../config/env';
import { InvitationNotExistError, NoPermissionsError, SubscriberOrgExistsError, SubscriberOrgNotExistError, UserNotExistError } from './errors';
import { deleteRedisInvitation, InvitationKeys, inviteExistingUsersToSubscriberOrg, inviteExternalUsersToSubscriberOrg } from './invitations';
import { subscriberAdded, subscriberOrgCreated, subscriberOrgPrivateInfoUpdated, subscriberOrgUpdated } from './messaging';
import { getPresence } from './messaging/presence';
import Roles from './roles';
import * as teamSvc from './teamService';
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
import { getRandomColor } from './util';


export function getUserSubscriberOrgs(req, userId) {
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

export function createSubscriberOrgNoCheck(req, subscriberOrgInfo, user, subscriberOrgId = undefined) {
   const actualSubscriberOrgId = subscriberOrgId || uuid.v4();
   const preferences = subscriberOrgInfo.preferences || { private: {} };
   if (preferences.private === undefined) {
      preferences.private = {};
   }
   preferences.iconColor = preferences.iconColor || getRandomColor();
   const subscriberOrg = {
      name: subscriberOrgInfo.name,
      enabled: true,
      preferences,
      created: req.now.format(),
      lastModified: req.now.format()
   };
   const subscriberUserId = uuid.v4();

   return new Promise((resolve, reject) => {
      const role = Roles.admin;
      createItem(req, -1, `${config.tablePrefix}subscriberOrgs`, 'subscriberOrgId', actualSubscriberOrgId, 'subscriberOrgInfo', subscriberOrg)
         .then(() => {
            const subscriberUser = {
               userId: user.userId,
               subscriberOrgId: actualSubscriberOrgId,
               role,
               created: req.now.format(),
               lastModified: req.now.format()
            };
            return createItem(req, -1, `${config.tablePrefix}subscriberUsers`, 'subscriberUserId', subscriberUserId, 'subscriberUserInfo', subscriberUser);
         })
         .then(() => {
            subscriberOrg.subscriberOrgId = actualSubscriberOrgId;
            subscriberOrgCreated(req, subscriberOrg, user.userId);
            subscriberAdded(req, actualSubscriberOrgId, user, role);
            return teamSvc.createTeamNoCheck(req, actualSubscriberOrgId, { name: teamSvc.defaultTeamName, primary: true }, subscriberUserId, user);
         })
         .then(() => resolve(subscriberOrg))
         .catch(err => reject(err));
   });
}

export function createSubscriberOrg(req, subscriberOrgInfo, userId, subscriberOrgId = undefined, dbUser = undefined) {
   return new Promise((resolve, reject) => {
      // TODO: if (userId), check canCreateSubscriberOrg() -> false, throw NoPermissionsError
      const promises = [getSubscriberOrgsByName(req, subscriberOrgInfo.name)];
      if (userId) {
         promises.push(getUsersByIds(req, [userId]));
      }
      Promise.all(promises)
         .then((promiseResults) => {
            const existingSubscriberOrgs = promiseResults[0];
            const user = (promises.length > 1) ? promiseResults[1][0] : dbUser;

            if (existingSubscriberOrgs.length > 0) {
               throw new SubscriberOrgExistsError(subscriberOrgInfo.name);
            }

            return createSubscriberOrgNoCheck(req, subscriberOrgInfo, user, subscriberOrgId);
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
export function createSubscriberOrgUsingBaseName(req, info, dbUser, subscriberOrgId = undefined, appendNumber = undefined) {
   const tryInfo = {
      name: info.name + ((appendNumber) ? ` (${appendNumber})` : ''),
      preferences: info.preferences
   };
   return new Promise((resolve, reject) => {
      createSubscriberOrg(req, tryInfo, undefined, subscriberOrgId, dbUser)
         .then(createdSubscriberOrg => resolve(createdSubscriberOrg))
         .catch((err) => {
            if (err instanceof SubscriberOrgExistsError) {
               const tryNumber = (appendNumber) ? appendNumber + 1 : 1;
               createSubscriberOrgUsingBaseName(req, info, dbUser, subscriberOrgId, tryNumber)
                  .then(createdSubscriberOrg => resolve(createdSubscriberOrg))
                  .catch(err2 => reject(err2));
            } else {
               reject(err);
            }
         });
   });
}

export function updateSubscriberOrg(req, subscriberOrgId, updateInfo, userId) {
   return new Promise((resolve, reject) => {
      const timestampedUpdateInfo = _.cloneDeep(updateInfo);
      timestampedUpdateInfo.lastModified = req.now.format();
      let dbSubscriberOrg;
      getSubscriberOrgsByIds(req, [subscriberOrgId])
         .then((subscriberOrgs) => {
            if (subscriberOrgs.length === 0) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            dbSubscriberOrg = subscriberOrgs[0];
            return getSubscriberUsersByUserIdAndSubscriberOrgIdAndRole(req, userId, subscriberOrgId, Roles.admin);
         })
         .then((subscriberUsers) => {
            if (subscriberUsers.length === 0) {
               throw new NoPermissionsError(subscriberOrgId);
            }

            return updateItem(req, -1, `${config.tablePrefix}subscriberOrgs`, 'subscriberOrgId', subscriberOrgId, { subscriberOrgInfo: timestampedUpdateInfo });
         })
         .then(() => {
            resolve();

            const subscriberOrg = dbSubscriberOrg.subscriberOrgInfo;
            _.merge(subscriberOrg, timestampedUpdateInfo); // Eventual consistency, so might be old.
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
export function getSubscriberOrgUsers(req, subscriberOrgId, userId = undefined) {
   const userIdsRoles = {};
   let usersWithRoles;
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
            usersWithRoles = users.map((user) => {
               const ret = _.cloneDeep(user);
               ret.userInfo.role = userIdsRoles[user.userId];
               return ret;
            });

            const presencePromises = [];
            usersWithRoles.forEach((userWithRoles) => {
               presencePromises.push(getPresence(req, userWithRoles.userId));
            });
            return Promise.all(presencePromises);
         })
         .then((presences) => {
            const userIdPresences = {};
            presences.forEach((presence) => {
               if ((presence) && (presence.length > 0)) {
                  const presenceNoUserIds = presence.map((p) => {
                     const presenceNoUserId = _.cloneDeep(p);
                     delete presenceNoUserId.userId;
                     return presenceNoUserId;
                  });
                  userIdPresences[presence[0].userId] = presenceNoUserIds;
               }
            });
            usersWithRoles = usersWithRoles.map((userWithRoles) => {
               const clone = _.cloneDeep(userWithRoles);
               clone.userInfo.presence = userIdPresences[userWithRoles.userId];
               return clone;
            });
            resolve(usersWithRoles);
         })
         .catch(err => reject(err));
   });
}

export function inviteSubscribers(req, subscriberOrgId, subscriberUserIdEmails, userId) {
   return new Promise((resolve, reject) => {
      let subscriberOrg;
      let dbUser;
      const userIds = new Set();
      const emails = new Set();
      let inviteDbUsers;

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
            subscriberOrg = subscriberOrgs[0];

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
               getUsersByEmailAddresses(req, [...emails])
            ]);
         })
         .then((promiseResults) => {
            let existingDbUsers = promiseResults[0].filter((existingDbUser) => {
               if (existingDbUser.userId === userId) {
                  dbUser = existingDbUser;
                  return false;
               }
               return true;
            });
            const retrievedUsersByEmail = promiseResults[1];

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

            // Make sure you don't invite yourself.
            inviteDbUsers = existingDbUsers.filter(existingDbUser => (existingDbUser.userId !== userId));
            const inviteDbUserIds = inviteDbUsers.map(inviteDbUser => inviteDbUser.userId);

            // Make sure invitees are not already in here.
            return getSubscriberUsersByUserIds(req, inviteDbUserIds);
         })
         .then((subscriberUsers) => {
            const subscriberUsersOfOrg = subscriberUsers.filter(subscriberUser => subscriberUser.subscriberUserInfo.subscriberOrgId === subscriberOrgId);
            if (subscriberUsersOfOrg.length !== 0) {
               const doNotInviteUserIds = subscriberUsersOfOrg.map(subscriberUser => subscriberUser.subscriberUserInfo.userId);
               inviteDbUsers = inviteDbUsers.filter(inviteDbUser => doNotInviteUserIds.indexOf(inviteDbUser.userId) < 0);
            }
            return Promise.all([
               inviteExistingUsersToSubscriberOrg(req, dbUser, inviteDbUsers, subscriberOrg),
               inviteExternalUsersToSubscriberOrg(req, dbUser, emails, subscriberOrg)
            ]);
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
}

function addUserToSubscriberOrg(req, user, subscriberOrgId, role) {
   return new Promise((resolve, reject) => {
      const subscriberUserId = uuid.v4();
      getSubscriberOrgsByIds(req, [subscriberOrgId])
         .then((subscriberOrgs) => {
            if (subscriberOrgs.length === 0) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            const subscriberUser = {
               userId: user.userId,
               subscriberOrgId,
               role,
               created: req.now.format(),
               lastModified: req.now.format()
            };
            return createItem(req, -1, `${config.tablePrefix}subscriberUsers`, 'subscriberUserId', subscriberUserId, 'subscriberUserInfo', subscriberUser);
         })
         .then(() => {
            subscriberAdded(req, subscriberOrgId, user, role);
            return teamSvc.addUserToPrimaryTeam(req, user, subscriberOrgId, subscriberUserId, Roles.user);
         })
         .then(() => resolve(subscriberUserId))
         .catch(err => reject(err));
   });
}

export function replyToInvite(req, subscriberOrgId, accept, userId) {
   return new Promise((resolve, reject) => {
      let user;
      getUsersByIds(req, [userId])
         .then((users) => {
            if (users.length === 0) {
               throw new UserNotExistError();
            }

            user = users[0];
            return deleteRedisInvitation(req, user.userInfo.emailAddress, InvitationKeys.subscriberOrgId, subscriberOrgId);
         })
         .then((invitation) => {
            if (invitation) {
               if (accept) {
                  return addUserToSubscriberOrg(req, user, subscriberOrgId, Roles.user);
               }
               return undefined;
            }
            throw new InvitationNotExistError(subscriberOrgId);
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
}
