import _ from 'lodash';
import uuid from 'uuid';
import {
   CannotInviteError,
   InvitationNotExistError,
   NoPermissionsError,
   SubscriberOrgExistsError,
   SubscriberOrgNotExistError,
   UserNotExistError,
   SubscriberUserExistsError
} from './errors';
import InvitationKeys from '../repositories/InvitationKeys';
import * as subscriberOrgsTable from '../repositories/db/subscriberOrgsTable';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';
import * as invitationsTable from '../repositories/db/invitationsTable';
import { deleteInvitation } from '../repositories/cache/invitationsCache';
import { inviteExistingUsersToSubscriberOrg, inviteExternalUsersToSubscriberOrg } from './invitationsUtil';
import {
   subscriberAdded,
   subscriberOrgCreated,
   subscriberOrgPrivateInfoUpdated,
   subscriberOrgUpdated,
   userInvitationAccepted,
   userInvitationDeclined,
   sentInvitationStatus
} from './messaging';
import { getPresence } from './messaging/presence';
import Roles from './roles';
import * as teamSvc from './teamService';
import * as usersTable from '../repositories/db/usersTable';

export const getUserSubscriberOrgs = (req, userId) => {
   return new Promise((resolve, reject) => {
      subscriberUsersTable.getSubscriberUsersByUserId(req, userId)
         .then((subscriberUsers) => {
            const subscriberOrgIds = subscriberUsers.map(subscriberUser => subscriberUser.subscriberOrgId);
            return subscriberOrgsTable.getSubscriberOrgsBySubscriberOrgIds(req, subscriberOrgIds);
         })
         .then((subscriberOrgs) => {
            resolve(subscriberOrgs);
         })
         .catch(err => reject(err));
   });
};

export const createSubscriberOrgNoCheck = (req, subscriberOrgInfo, user, subscriberOrgId = undefined) => {
   return new Promise((resolve, reject) => {
      const actualSubscriberOrgId = subscriberOrgId || uuid.v4();
      const icon = subscriberOrgInfo.icon || null;
      const preferences = subscriberOrgInfo.preferences || { private: {} };
      if (preferences.private === undefined) {
         preferences.private = {};
      }
      preferences.iconColor = preferences.iconColor || '#EB4435'; // default color for team room;
      let subscriberOrg;
      const subscriberUserId = uuid.v4();
      const role = Roles.admin;

      subscriberOrgsTable.createSubscriberOrg(req, actualSubscriberOrgId, subscriberOrgInfo.name, icon, preferences)
         .then((createdSubscriberOrg) => {
            subscriberOrg = createdSubscriberOrg;
            return subscriberUsersTable.createSubscriberUser(req, subscriberUserId, user.userId, actualSubscriberOrgId, role, user.displayName);
         })
         .then(() => {
            subscriberOrgCreated(req, subscriberOrg, user.userId);
            subscriberAdded(req, actualSubscriberOrgId, user, role, subscriberUserId);
            return teamSvc.createTeamNoCheck(req, actualSubscriberOrgId, { name: teamSvc.defaultTeamName, primary: true }, subscriberUserId, user, [subscriberUserId]);
         })
         .then(() => resolve(subscriberOrg))
         .catch(err => reject(err));
   });
};

export const createSubscriberOrg = (req, subscriberOrgInfo, userOrUserId, subscriberOrgId = undefined) => {
   return new Promise((resolve, reject) => {
      subscriberOrgsTable.getSubscriberOrgByName(req, subscriberOrgInfo.name)
         .then((subscriberOrg) => {
            if (subscriberOrg) {
               throw new SubscriberOrgExistsError(subscriberOrgInfo.name);
            }

            if (_.isString(userOrUserId)) {
               return usersTable.getUserByUserId(req, userOrUserId);
            }
            return userOrUserId;
         })
         .then(user => createSubscriberOrgNoCheck(req, subscriberOrgInfo, user, subscriberOrgId))
         .then(subscriberOrg => resolve(subscriberOrg))
         .catch(err => reject(err));
   });
};

/**
 * Create a subscriber organization given the name+`appendNumber`.
 * if the name exists, append ' (n)', where n >= 1 to avoid conflict.
 *
 * @param req
 * @param subscriberOrgName
 * @param appendNumber (optional)
 */
export const createSubscriberOrgUsingBaseName = (req, info, user, subscriberOrgId = undefined, appendNumber = undefined) => {
   const tryInfo = {
      name: info.name + ((appendNumber) ? ` (${appendNumber})` : ''),
      preferences: info.preferences
   };
   return new Promise((resolve, reject) => {
      createSubscriberOrg(req, tryInfo, user, subscriberOrgId)
         .then(createdSubscriberOrg => resolve(createdSubscriberOrg))
         .catch((err) => {
            if (err instanceof SubscriberOrgExistsError) {
               const tryNumber = (appendNumber) ? appendNumber + 1 : 1;
               createSubscriberOrgUsingBaseName(req, info, user, subscriberOrgId, tryNumber)
                  .then(createdSubscriberOrg => resolve(createdSubscriberOrg))
                  .catch(err2 => reject(err2));
            } else {
               reject(err);
            }
         });
   });
};

export const updateSubscriberOrg = (req, subscriberOrgId, updateInfo, userId) => {
   return new Promise((resolve, reject) => {
      let originalSubscriberOrg;
      subscriberOrgsTable.getSubscriberOrgBySubscriberOrgId(req, subscriberOrgId)
         .then((retrievedOriginalSubscriberOrg) => {
            originalSubscriberOrg = retrievedOriginalSubscriberOrg;
            if (!originalSubscriberOrg) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }
         })
         .then(() => subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgIdAndRole(req, userId, subscriberOrgId, Roles.admin))
         .then((subscriberUser) => {
            if (!subscriberUser) {
               throw new NoPermissionsError(subscriberOrgId);
            }

            if ((updateInfo.name) && (originalSubscriberOrg.name !== updateInfo.name)) {
               return subscriberOrgsTable.getSubscriberOrgByName(req, updateInfo.name);
            }
            return undefined;
         })
         .then((duplicateName) => {
            if (duplicateName) {
               throw new SubscriberOrgExistsError(updateInfo.name);
            }

            return subscriberOrgsTable.updateSubscriberOrg(req, subscriberOrgId, updateInfo);
         })
         .then((subscriberOrg) => {
            resolve();

            subscriberOrgUpdated(req, subscriberOrg);
            if ((updateInfo.preferences) && (updateInfo.preferences.private)) {
               subscriberOrgPrivateInfoUpdated(req, subscriberOrg);
            }

            const { enabled: previousEnabled } = originalSubscriberOrg;
            if (('enabled' in updateInfo) && (previousEnabled !== updateInfo.enabled)) {
               // Enable/disable children.
               teamSvc.setTeamsOfSubscriberOrgActive(req, subscriberOrgId, updateInfo.enabled);
            }
         })
         .catch(err => reject(err));
   });
};

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
export const getSubscriberOrgUsers = (req, subscriberOrgId, userId = undefined) => {
   const userIdsRoles = {};
   const userIdsSubscriberUserIds = {};
   let usersWithRoles;
   return new Promise((resolve, reject) => {
      subscriberUsersTable.getSubscriberUsersBySubscriberOrgId(req, subscriberOrgId)
         .then((subscriberUsers) => {
            if (subscriberUsers.length === 0) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            const userIds = subscriberUsers.map((subscriberUser) => {
               userIdsRoles[subscriberUser.userId] = subscriberUser.role;
               userIdsSubscriberUserIds[subscriberUser.userId] = subscriberUser.subscriberUserId;
               return subscriberUser.userId;
            });
            if ((userId) && (userIds.indexOf(userId)) < 0) {
               throw new NoPermissionsError(subscriberOrgId);
            }

            return usersTable.getUsersByUserIds(req, userIds);
         })
         .then((users) => {
            usersWithRoles = users.map((user) => {
               const ret = _.cloneDeep(user);
               ret.role = userIdsRoles[user.userId];
               ret.subscriberUserId = userIdsSubscriberUserIds[user.userId];
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
               clone.presence = userIdPresences[userWithRoles.userId];
               return clone;
            });
            resolve(usersWithRoles);
         })
         .catch(err => reject(err));
   });
};

export const inviteSubscribers = (req, subscriberOrgId, subscriberUserIdEmails, userId) => {
   return new Promise((resolve, reject) => {
      let subscriberOrg;
      let dbUser;
      const userIds = new Set();
      const emails = new Set();
      let inviteDbUsers;

      Promise.all([
         subscriberOrgsTable.getSubscriberOrgBySubscriberOrgId(req, subscriberOrgId),
         subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgIdAndRole(req, userId, subscriberOrgId, Roles.admin)
      ])
         .then(([retrievedSubscriberOrg, subscriberUser]) => {
            subscriberOrg = retrievedSubscriberOrg;
            if (!subscriberOrg) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            if (!subscriberUser) {
               throw new NoPermissionsError(subscriberOrgId);
            }

            if (('enabled' in subscriberOrg) && (subscriberOrg.enabled === false)) {
               throw new CannotInviteError(subscriberOrgId);
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
               usersTable.getUsersByUserIds(req, [userId, ...userIds]),
               usersTable.getUsersByEmailAddresses(req, [...emails])
            ]);
         })
         .then(([users, retrievedUsersByEmail]) => {
            let existingDbUsers = users.filter((existingDbUser) => {
               if (existingDbUser.userId === userId) {
                  dbUser = existingDbUser;
                  return false;
               }
               return true;
            });

            // If any of the userIds are bad, fail.
            if (existingDbUsers.length !== userIds.size) {
               throw new UserNotExistError();
            }

            // Convert any found emails to existing users.
            if (retrievedUsersByEmail.length > 0) {
               retrievedUsersByEmail.forEach((user) => {
                  existingDbUsers.push(user);
                  emails.delete(user.emailAddress);
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
            return subscriberUsersTable.getSubscriberUsersByUserIdsAndSubscriberOrgId(req, inviteDbUserIds, subscriberOrgId);
         })
         .then((subscriberUsers) => {
            const subscriberUsersOfOrg = subscriberUsers.filter(subscriberUser => ((subscriberUser) && (subscriberUser.subscriberOrgId === subscriberOrgId)));
            if (subscriberUsersOfOrg.length !== 0) {
               const doNotInviteUserIds = subscriberUsersOfOrg.map(subscriberUser => subscriberUser.userId);
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
};

const addUserToSubscriberOrg = (req, user, subscriberOrgId, role) => {
   return new Promise((resolve, reject) => {
      const subscriberUserId = uuid.v4();
      subscriberOrgsTable.getSubscriberOrgBySubscriberOrgId(req, subscriberOrgId)
         .then((subscriberOrg) => {
            if (!subscriberOrg) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            subscriberUsersTable.createSubscriberUser(req, subscriberUserId, user.userId, subscriberOrgId, role, user.displayName);
         })
         .then(() => {
            subscriberAdded(req, subscriberOrgId, user, role, subscriberUserId);
            return teamSvc.addUserToPrimaryTeam(req, user, subscriberOrgId, subscriberUserId, Roles.user);
         })
         .then(() => resolve(subscriberUserId))
         .catch(err => reject(err));
   });
};

export const replyToInvite = (req, subscriberOrgId, accept, userId) => {
   return new Promise((resolve, reject) => {
      let user;
      let subscriberOrg;
      let cachedInvitation;
      Promise.all([
         usersTable.getUserByUserId(req, userId),
         subscriberOrgsTable.getSubscriberOrgBySubscriberOrgId(req, subscriberOrgId)],
         subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
      )
         .then(([retrievedUser, retrievedSubscriberOrg, subscriberUser]) => {
            user = retrievedUser;
            subscriberOrg = retrievedSubscriberOrg;
            if (!user) {
               throw new UserNotExistError();
            }

            if (!subscriberOrg) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            if (subscriberUser) {
               throw new SubscriberUserExistsError(`userId=${userId}, subscriberOrgId=${subscriberOrgId}`);
            }

            return deleteInvitation(req, user.emailAddress, InvitationKeys.subscriberOrgId, subscriberOrgId);
         })
         .then((retrievedCachedInvitation) => {
            cachedInvitation = retrievedCachedInvitation;
            if (cachedInvitation) {
               if (accept) {
                  if (subscriberOrg.enabled === true) {
                     userInvitationAccepted(req, cachedInvitation, user.emailAddress);
                     return addUserToSubscriberOrg(req, user, subscriberOrgId, Roles.user);
                  }
               } else {
                  userInvitationDeclined(req, cachedInvitation, user.emailAddress);
               }
               return undefined;
            }
            throw new InvitationNotExistError(subscriberOrgId);
         })
         .then(() => {
            const state = (accept) ? 'ACCEPTED' : 'DECLINED';
            return invitationsTable.updateInvitationsStateByInviteeEmail(req, user.emailAddress, InvitationKeys.subscriberOrgId, subscriberOrgId, state);
         })
         .then((changedInvitations) => {
            resolve();
            sentInvitationStatus(req, changedInvitations);
         })
         .catch((err) => {
            if (err instanceof SubscriberUserExistsError) {
               resolve();
            } else {
               reject(err);
            }
         });
   });
};
