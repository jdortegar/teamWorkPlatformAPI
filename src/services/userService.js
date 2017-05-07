import _ from 'lodash';
import uuid from 'uuid';
import config from '../config/env';
import { NoPermissionsError, UserNotExistError } from './errors';
import { getRedisInvitations } from './invitations';
import { userCreated, userUpdated } from './messaging';
import subscriberOrgSvc from './subscriberOrgService';
import { createItem, getUsersByIds, updateItem } from './queries';
import { hashPassword } from '../models/user';

function addUserToCache(req, email, uid, status) {
   return new Promise((resolve, reject) => {
      console.log(`users-create: user ${email} not in cache`);
      console.log(`users-create: new uuid: ${uid}`);
      req.app.locals.redis.hmsetAsync(email, 'uid', uid, 'status', status)
         .then((addUserToCacheResponse) => {
            console.log(`users-create: created redis hash for email: ${email}`);
            resolve(addUserToCacheResponse);
         })
         .catch((err) => {
            console.log('users-create: hmset status - redis error');
            reject(err);
         });
   });
}


class UserService {
   createUser(req, userInfo) {
      return new Promise((resolve, reject) => {
         const { email } = userInfo;
         const userId = uuid.v4();
         let user;

         // First, use email addr to see if it's already in redis.
         req.app.locals.redis.hgetallAsync(email)
            .then((cachedEmail) => {
               if (cachedEmail === null) {
                  // Otherwise, add user to cache add user table.
                  const status = 1;
                  const subscriberOrgId = uuid.v4();
                  const subscriberOrgName = req.body.displayName;

                  const { firstName, lastName, displayName, password, country, timeZone } = userInfo;
                  const icon = userInfo.icon || null;
                  const preferences = userInfo.preferences || { private: {} };
                  if (preferences.private === undefined) {
                     preferences.private = {};
                  }
                  user = {
                     emailAddress: email,
                     firstName,
                     lastName,
                     displayName,
                     password: hashPassword(password),
                     country,
                     timeZone,
                     icon,
                     preferences
                     // ,iconType
                  };

                  return Promise.all([
                     addUserToCache(req, email, userId, status),
                     createItem(req, -1, `${config.tablePrefix}users`, 'userId', userId, 'userInfo', user),
                     subscriberOrgSvc.createSubscriberOrgUsingBaseName(req, { name: subscriberOrgName }, userId, subscriberOrgId)
                  ]);
               }
               return undefined;
            })
            .then((cacheAndDbStatuses) => {
               if (cacheAndDbStatuses) {
                  // TODO: Do we need to send them a second email?
                  // mailer.sendActivationLink(email, uid).then(() => {
                  //
                  //   const response = {
                  //     status: 'SUCCESS',
                  //     uuid: uid
                  //   };
                  //   res.json(response);
                  //   res.status(httpStatus.OK).json();
                  //
                  // }); // Needs to be a promise.

                  user.userId = userId;
                  resolve(user);
                  userCreated(req, user);
               } else {
                  // Key is found in cache, user already registered.
                  console.log(`users-create: user ${email} found in cache`);
                  reject(new NoPermissionsError(email));
               }
            })
            .catch((err) => {
               console.log('\n\nAD: 1');
               console.error(err);
               reject(err);
            });
      });
   }

   updateUser(req, userId, updateInfo, requestorUserId = undefined) {
      // TODO: if (requestorUserId) check if allowed, throw NoPermissionsError if not.
      return new Promise((resolve, reject) => {
         let user;
         getUsersByIds(req, [userId])
            .then((dbUsers) => {
               if (dbUsers.length < 1) {
                  throw new UserNotExistError(userId);
               }

               user = dbUsers[0].userInfo;
               updateItem(req, -1, `${config.tablePrefix}users`, 'userId', userId, { userInfo: updateInfo });
            })
            .then(() => {
               resolve();

               _.merge(user, updateInfo);
               user.userId = userId;
               userUpdated(req, user);
            })
            .catch(err => reject(err));
      });
   }

   getInvitations(req, email) {
      return new Promise((resolve, reject) => {
         getRedisInvitations(req, email)
            .then((keyValues) => {
               if (keyValues === null) {
                  resolve([]);
               } else {
                  const invitations = [];
                  Object.values(keyValues).forEach(invitation => invitations.push(invitation));
                  resolve(invitations);
               }
            })
            .catch(err => reject(err));
      });
   }
}

const userService = new UserService();
export default userService;
