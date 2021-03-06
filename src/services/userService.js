import _ from 'lodash';
import uuid from 'uuid';
import config from '../config/env';
import { NoPermissionsError, UserNotExistError, CustomerExistsError } from './errors';
import { getRandomColor } from './util';
import { hashPassword, passwordMatch } from '../models/user';
import * as usersTable from '../repositories/db/usersTable';
import * as messagesTable from '../repositories/db/messagesTable';
import * as usersCache from '../repositories/cache/usersCache';
import * as invitationsRepo from '../repositories/invitationsRepo';
import * as awsMarketplaceSvc from './awsMarketplaceService';
import * as subscriberOrgSvc from './subscriberOrgService';
import { userCreated, userUpdated, userPrivateInfoUpdated, userBookmarksUpdated } from './messaging';

const getUserByEmail = (req, email) => {
   return new Promise((resolve, reject) => {
      let user;
      usersTable.getUserByEmailAddress(req, email)
         .then((retrievedUser) => {
            user = retrievedUser;
            if (user) {
               return usersCache.createUser(req, email, user.userId);
            }
            return undefined;
         })
         .then(() => resolve(user))
         .catch(err => reject(err));
   });
};

export const login = (req, email, password) => {
   return new Promise((resolve, reject) => {
      getUserByEmail(req, email)
         .then((user) => {
            if ((user) && (passwordMatch(user, password))) {
               resolve(user);
            } else {
               throw new NoPermissionsError(email);
            }
         })
         .catch(err => reject(err));
   });
};

export const createUser = (req, userInfo) => {
   return new Promise((resolve, reject) => {
      const { email: emailAddress } = userInfo;
      const userId = uuid.v4();
      let user;

      usersTable.getUserByEmailAddress(req, emailAddress)
         .then((existingUser) => {
            user = existingUser;
            if (user) {
               throw new NoPermissionsError(emailAddress);
            }

            const { firstName, lastName, displayName, country, timeZone } = userInfo;
            const password = hashPassword(userInfo.password);
            const icon = userInfo.icon || null;
            const preferences = userInfo.preferences || { private: {} };
            if (preferences.private === undefined) {
               preferences.private = {};
            }
            preferences.iconColor = preferences.iconColor || getRandomColor();
            return Promise.all([
               usersTable.createUser(req, userId, firstName, lastName, displayName, emailAddress, password, country, timeZone, icon, preferences),
               usersCache.createUser(req, emailAddress, userId)
            ]);
         })
         .then((promiseResults) => {
            user = promiseResults[0];
            const subscriberOrgId = uuid.v4();
            const subscriberOrgName = req.body.displayName;
            return subscriberOrgSvc.createSubscriberOrgUsingBaseName(req, { name: subscriberOrgName }, user, subscriberOrgId);
         })
         .then(() => {
            userCreated(req, user);

            // See if it's a new AWS customer. // TODO: refactor into cache dir.
            return req.app.locals.redis.getAsync(`${config.redisPrefix}${emailAddress}#awsCustomerId`);
         })
         .then((awsCustomerId) => {
            if ((awsCustomerId) && (awsCustomerId !== null)) {
               return new Promise((resolve2, reject2) => {
                  awsMarketplaceSvc.registerCustomer(req, awsCustomerId, user)
                     .then(() => resolve2())
                     .catch((err) => {
                        if (err instanceof CustomerExistsError) {
                           // TODO: do we auto invite, etc.
                        } else {
                           reject2(err); // TODO:
                        }
                     });
               });
            }
            return undefined;
         })
         .then(() => resolve(user))
         .catch(err => reject(err));
   });
};

const resolveBookmarks = (req, bookmarks) => {
   return new Promise((resolve, reject) => {
      const messagePromises = {};
      Object.keys(bookmarks).forEach((subscriberOrgId) => {
         const messageIds = bookmarks[subscriberOrgId].messageIds;
         Object.keys(messageIds).forEach((messageId) => {
            const bookmark = messageIds[messageId];
            const { conversationId } = bookmark;
            const prevSiblingId = bookmark.prevSiblingId;

            if (!messagePromises[messageId]) {
               messagePromises[messageId] = messagesTable.getMessageByConversationIdAndMessageId(req, conversationId, messageId);
            }
            if ((!prevSiblingId) && (!messagePromises[prevSiblingId])) {
               messagePromises[prevSiblingId] = messagesTable.getMessageByConversationIdAndMessageId(req, conversationId, prevSiblingId);
            }
         });
      });

      if (Object.keys(messagePromises).length > 0) {
         const resolvedBookmarks = { ...bookmarks, messages: {} };
         Promise.all(Object.values(messagePromises))
            .then((messages) => {
               messages.forEach((message) => { resolvedBookmarks.messages[message.messageId] = message; });
               resolve(resolvedBookmarks);
            })
            .catch(err => reject(err));
      } else {
         const resolvedBookmarks = { ...bookmarks, messages: {} };
         resolve(resolvedBookmarks);
      }
   });
};

export const updateUser = (req, userId, updateInfo) => {
   return new Promise((resolve, reject) => {
      usersTable.updateUser(req, userId, updateInfo)
         .then((user) => {
            resolve(user);
            userUpdated(req, user);
            if ((updateInfo.preferences) && (updateInfo.preferences.private)) {
               userPrivateInfoUpdated(req, user);
            }
            if (updateInfo.bookmarks) {
               resolveBookmarks(req, user.bookmarks)
                  .then(resolvedBookmarks => userBookmarksUpdated(req, user, resolvedBookmarks));
            }
         })
         .catch(err => reject(err));
   });
};

export const updatePassword = (req, userId, oldPassword, newPassword) => {
   return new Promise((resolve, reject) => {
      usersTable.getUserByUserId(req, userId)
         .then((user) => {
            if (!user) {
               throw new UserNotExistError(userId);
            }

            if (passwordMatch(user, oldPassword)) {
               const hashedPassword = hashPassword(newPassword);
               return usersTable.updateUser(req, userId, { password: hashedPassword });
            }
            throw new Error('Incorrect Password!');
         })
         .then((user) => {
            resolve(user);
            // userPasswordUpdated(req, user);
         })
         .catch(err => reject(err));
   });
};

export const resetPassword = (req, email, password) => {
   return new Promise((resolve, reject) => {
      usersTable.getUserByEmailAddress(req, email)
         .then((user) => {
            if (!user) {
               throw new UserNotExistError(email);
            }

            const hashedPassword = hashPassword(password);
            return usersTable.updateUser(req, user.userId, { password: hashedPassword });
         })
         .then((user) => {
            resolve(user);
            // userPasswordUpdated(req, user);
         })
         .catch(err => reject(err));
   });
};

export const getInvitations = (req, email) => {
   return new Promise((resolve, reject) => {
      invitationsRepo.getInvitationsByInviteeEmail(req, email)
         .then((invitations) => {
            if (invitations === null) {
               resolve([]);
            } else {
               // Multiple invitations get be sent out to a person for a specific org/team/room.  Only need the last one.
               const uniqueInvitations = [];
               invitations.forEach((invitation) => {
                  _.remove(uniqueInvitations, (uniqueInvitation) => {
                     return (
                        (uniqueInvitation.subscriberOrgId === invitation.subscriberOrgId) &&
                        (uniqueInvitation.teamId === invitation.teamId)
                     );
                  });
                  uniqueInvitations.push(invitation);
               });
               resolve(uniqueInvitations);
            }
         })
         .catch(err => reject(err));
   });
};

export const getSentInvitations = (req, userId, { since = undefined, state = undefined }) => {
   return new Promise((resolve, reject) => {
      invitationsRepo.getInvitationsByInviterUserId(req, userId, { since, state })
         .then((invitations) => {
            if (invitations === null) {
               resolve([]);
            } else {
               resolve(invitations);
            }
         })
         .catch(err => reject(err));
   });
};

export const getUserNameHash = async (req, userIds = []) => {
    const users = await usersTable.getUsersByUserIds(req, userIds);
    const hash = {};
    _.forEach(users, (user) => {
          hash[user.userId] = `${user.firstName} ${user.lastName}`
    });
    return hash;
}
