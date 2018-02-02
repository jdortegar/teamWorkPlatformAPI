import _ from 'lodash';
import config from '../../config/env';
import * as util from './util';
import { UserNotExistError } from '../../services/errors';

/**
 * hash: userId
 * v
 * firstName
 * lastName
 * displayName
 * emailAddress
 * password
 * country
 * timeZone
 * icon
 * defaultLocale
 * enabled
 * presenceStatus
 * bookmarks
 * created
 * lastModified
 * preferences
 *
 * GSI: emailAddressIdx
 * hash: emailAddress
 */
const tableName = () => {
   return `${config.tablePrefix}users`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const createUser = (req,
   userId,
   firstName,
   lastName,
   displayName,
   emailAddress,
   password,
   country,
   timeZone,
   icon,
   preferences,
   { defaultLocale = 'en', enabled = true } = {}) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            userId,
            v,
            firstName,
            lastName,
            displayName,
            emailAddress,
            password,
            country,
            timeZone,
            icon,
            defaultLocale: defaultLocale || 'en',
            enabled: enabled || true,
            presenceStatus: null,
            bookmarks: [],
            created: req.now.format(),
            lastModified: req.now.format(),
            preferences
         }
      };

      req.app.locals.docClient.put(params).promise()
         .then(result => resolve(result.$response.request.rawParams.Item))
         .catch(err => reject(err));
   });
};

export const getUsersByUserIds = (req, userIds) => {
   return new Promise((resolve, reject) => {
      util.batchGet(req, tableName(), 'userId', userIds)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getUserByUserId = (req, userId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'userId = :userId',
         ExpressionAttributeValues: {
            ':userId': userId
         }
      };

      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getUserByEmailAddress = (req, emailAddress) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'emailAddressIdx',
         KeyConditionExpression: 'emailAddress = :emailAddress',
         ExpressionAttributeValues: {
            ':emailAddress': emailAddress
         }
      };

      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getUsersByEmailAddresses = (req, emailAddresses) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'emailAddressIdx',
         ExpressionAttributeValues: {}
      };
      let idx = 0;
      emailAddresses.forEach((emailAddress) => {
         if (!params.KeyConditionExpression) {
            params.KeyConditionExpression = `emailAddress = :emailAddress${idx}`;
         } else {
            params.KeyConditionExpression += ` or emailAddress = :emailAddress${idx}`;
         }
         params.ExpressionAttributeValues[`:emailAddress${idx}`] = emailAddress;
         idx += 1;
      });

      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

class UpdateExpression {
   updateExpression;
   expressionAttributeValues = {};

   addUpdate(field, value) {
      if (value === undefined) {
         return;
      }

      if (!this.updateExpression) {
         this.updateExpression = 'set';
      } else {
         this.updateExpression += ',';
      }
      this.updateExpression = ` ${field} = :${field}`;
      this.expressionAttributeValues[`:${field}`] = value;
   }
}

export const updateUser = (req, userId,
   {
      firstName,
      lastName,
      displayName,
      emailAddress,
      password,
      country,
      timeZone,
      icon,
      defaultLocale,
      presenceStatus,
      bookmarks,
      preferences
   }) => {
   return new Promise((resolve, reject) => {
      let user;
      const lastModified = req.now.format();
      getUserByUserId(req, userId)
         .then((retrievedUser) => {
            user = retrievedUser;
            if (!user) {
               throw new UserNotExistError(userId);
            }

            const updateExpression = new UpdateExpression();
            updateExpression.addUpdate('firstName', firstName);
            updateExpression.addUpdate('lastName', lastName);
            updateExpression.addUpdate('displayName', displayName);
            updateExpression.addUpdate('emailAddress', emailAddress);
            updateExpression.addUpdate('password', password);
            updateExpression.addUpdate('country', country);
            updateExpression.addUpdate('timeZone', timeZone);
            updateExpression.addUpdate('icon', icon);
            updateExpression.addUpdate('defaultLocale', defaultLocale);
            updateExpression.addUpdate('presenceStatus', presenceStatus);
            updateExpression.addUpdate('bookmarks', bookmarks);
            updateExpression.addUpdate('preferences', preferences);
            updateExpression.addUpdate('lastModified', lastModified);

            const params = {
               TableName: tableName(),
               Key: { userId },
               UpdateExpression: updateExpression.updateExpression,
               ExpressionAttributeValues: updateExpression.expressionAttributeValues
            };
            return req.app.locals.docClient.update(params).promise();
         })
         .then(() => resolve(_.merge({}, user, {
            firstName,
            lastName,
            displayName,
            emailAddress,
            password,
            country,
            timeZone,
            icon,
            defaultLocale,
            presenceStatus,
            bookmarks,
            preferences,
            lastModified
         })))
         .catch(err => reject(err));
   });
};
