import _ from 'lodash';
import uuid from 'uuid';
import config from '../config/env';
import { NoPermissionsError, UserNotExistError, CustomerExistsError } from './errors';
import { getInvitationsByInviteeEmail } from './invitationsUtil';
import { userCreated, userUpdated, userPrivateInfoUpdated } from './messaging';
import * as subscriberOrgSvc from './subscriberOrgService';
import { createItem, getUsersByIds, getUsersByEmailAddresses, updateItem } from '../repositories/util';
import { getRandomColor } from './util';
import { hashPassword } from '../models/user';
import * as awsMarketplaceSvc from './awsMarketplaceService';

export function addUserToCache(req, email, uid, status) {
   return new Promise((resolve, reject) => {
      req.logger.debug(`users-create: user ${email} not in cache`);
      req.logger.debug(`users-create: new uuid: ${uid}`);
      req.app.locals.redis.hmsetAsync(`${config.redisPrefix}${email}`, 'uid', uid, 'status', status)
         .then((addUserToCacheResponse) => {
            req.logger.debug(`users-create: created redis hash for email: ${email}`);
            resolve(addUserToCacheResponse);
         })
         .catch((err) => {
            req.logger.debug('users-create: hmset status - redis error');
            reject(err);
         });
   });
}


export function getUserByEmail(req, email, cache = false) {
   return new Promise((resolve, reject) => {
      let dbUser;
      getUsersByEmailAddresses(req, [email])
         .then((users) => {
            if (users.length > 0) {
               dbUser = users[0];
               if (cache) {
                  const status = 1;
                  addUserToCache(req, email, dbUser.userId, status)
                     .catch(err => req.logger.error(err));
               }
            }
            return undefined;
         })
         .then(() => resolve(dbUser))
         .catch(err => reject(err));
   });
}

export function createUser(req, userInfo) {
   return new Promise((resolve, reject) => {
      const { email } = userInfo;
      const userId = uuid.v4();
      let user;
      const subscriberOrgId = uuid.v4();
      const subscriberOrgName = req.body.displayName;

      // First, use email addr to see if it's already in redis.
      req.app.locals.redis.hgetallAsync(`${config.redisPrefix}${email}`)
         .then((cachedEmail) => {
            if (cachedEmail === null) {
               // Otherwise, add user to cache add user table.
               const status = 1;

               const { firstName, lastName, displayName, password, country, timeZone } = userInfo;
               const icon = userInfo.icon || null;
               const preferences = userInfo.preferences || { private: {} };
               if (preferences.private === undefined) {
                  preferences.private = {};
               }
               preferences.iconColor = preferences.iconColor || getRandomColor();
               user = {
                  emailAddress: email,
                  firstName,
                  lastName,
                  displayName,
                  password: hashPassword(password),
                  country,
                  timeZone,
                  icon,
                  enabled: true,
                  preferences,
                  created: req.now.format(),
                  lastModified: req.now.format()
               };

               return Promise.all([
                  addUserToCache(req, email, userId, status),
                  createItem(req, -1, `${config.tablePrefix}users`, 'userId', userId, 'userInfo', user)
               ]);
            }
            return undefined;
         })
         .then((cacheAndDbStatuses) => {
            if (cacheAndDbStatuses) {
               const dbResponse = cacheAndDbStatuses[1];
               if ((dbResponse.$response) && (dbResponse.$response.error !== null)) {
                  throw dbResponse.error;
               }

               const dbUser = { userId, userInfo: _.cloneDeep(user) };
               user.userId = userId;
               return subscriberOrgSvc.createSubscriberOrgUsingBaseName(req, { name: subscriberOrgName }, dbUser, subscriberOrgId);
            }

            return undefined;
         })
         .then((createdSubscriberOrg) => {
            if (createdSubscriberOrg) {
               userCreated(req, user);

               // See if it's a new AWS customer.
               return req.app.locals.redis.getAsync(`${config.redisPrefix}${email}#awsCustomerId`);
            }

            // Key is found in cache, user already registered.
            req.logger.debug(`users-create: user ${email} found in cache`);
            throw new NoPermissionsError(email);
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
         .catch((err) => {
            req.logger.warn(err);
            reject(err);
         });
   });
}

export function updateUser(req, userId, updateInfo, requestorUserId = undefined) { // eslint-disable-line no-unused-vars
   // TODO: if (requestorUserId) check if allowed, throw NoPermissionsError if not.
   return new Promise((resolve, reject) => {
      const timestampedUpdateInfo = updateInfo;
      timestampedUpdateInfo.lastModified = req.now.format();
      let user;
      getUsersByIds(req, [userId])
         .then((dbUsers) => {
            if (dbUsers.length < 1) {
               throw new UserNotExistError(userId);
            }

            user = dbUsers[0].userInfo;
            return updateItem(req, -1, `${config.tablePrefix}users`, 'userId', userId, { userInfo: timestampedUpdateInfo });
         })
         .then(() => {
            resolve();

            _.merge(user, timestampedUpdateInfo);
            user.userId = userId;
            userUpdated(req, user);
            if ((updateInfo.preferences) && (updateInfo.preferences.private)) {
               userPrivateInfoUpdated(req, user);
            }
         })
         .catch(err => reject(err));
   });
}

export const getInvitations = (req, email) => {
   return new Promise((resolve, reject) => {
      getInvitationsByInviteeEmail(req, email)
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
