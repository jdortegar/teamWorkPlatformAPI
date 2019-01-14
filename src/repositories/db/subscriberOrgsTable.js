import _ from 'lodash';
import config from '../../config/env';
import * as util from './util';
import { SubscriberOrgNotExistError } from '../../services/errors';

/**
 * hash: subscriberOrgId
 * v
 * name
 * icon
 * enabled
 * created
 * lastModified
 * preferences
 * stripeSubscriptionId
 * paypalSubscriptionId
 * userLimit
 *
 * GSI: nameIdx
 * hash: name
 */
const tableName = () => {
   return `${config.tablePrefix}subscriberOrgs`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const createSubscriberOrg = (req, subscriberOrgId, name, icon, preferences, stripeSubscriptionId, paypalSubscriptionId, userLimit) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            subscriberOrgId,
            v,
            name,
            icon,
            enabled: true,
            created: req.now.format(),
            lastModified: req.now.format(),
            preferences,
            stripeSubscriptionId,
            paypalSubscriptionId,
            userLimit
         }
      };

      req.app.locals.docClient
         .put(params)
         .promise()
         .then(result => resolve(result.$response.request.rawParams.Item))
         .catch(err => reject(err));
   });
};

export const getSubscriberOrgBySubscriberOrgId = (req, subscriberOrgId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'subscriberOrgId = :subscriberOrgId',
         ExpressionAttributeValues: {
            ':subscriberOrgId': subscriberOrgId
         }
      };
      util
         .query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults.length > 0 ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getSubscriberOrgsBySubscriberOrgIds = (req, subscriberOrgIds) => {
   return new Promise((resolve, reject) => {
      util
         .batchGet(req, tableName(), 'subscriberOrgId', subscriberOrgIds)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getSubscriberOrgByName = (req, name) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'nameIdx',
         KeyConditionExpression: '#name = :name',
         ExpressionAttributeNames: {
            '#name': 'name'
         },
         ExpressionAttributeValues: {
            ':name': name
         }
      };
      util
         .query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults.length > 0 ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const updateSubscriberOrg = (req, subscriberOrgId, { name, icon, enabled, preferences, userLimit } = {}) => {
   return new Promise((resolve, reject) => {
      const lastModified = req.now.format();
      let subscriberOrg;
      getSubscriberOrgBySubscriberOrgId(req, subscriberOrgId)
         .then(retrievedSubscriberOrg => {
            subscriberOrg = retrievedSubscriberOrg;
            if (!subscriberOrg) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }

            const params = {
               TableName: tableName(),
               Key: { subscriberOrgId },
               UpdateExpression: 'set lastModified = :lastModified',
               ExpressionAttributeNames: {},
               ExpressionAttributeValues: {
                  ':lastModified': lastModified
               }
            };

            if (name) {
               params.UpdateExpression += ', #name = :name';
               params.ExpressionAttributeNames['#name'] = 'name';
               params.ExpressionAttributeValues[':name'] = name;
            }
            if (icon) {
               params.UpdateExpression += ', icon = :icon';
               params.ExpressionAttributeValues[':icon'] = icon;
            }
            if (_.isBoolean(enabled)) {
               params.UpdateExpression += ', enabled = :enabled';
               params.ExpressionAttributeValues[':enabled'] = enabled;
            }
            if (preferences) {
               params.UpdateExpression += ', preferences = :preferences';
               params.ExpressionAttributeValues[':preferences'] = preferences;
            }
            if (userLimit) {
               params.UpdateExpression += ', #userLimit = :userLimit';
               params.ExpressionAttributeNames['#userLimit'] = 'userLimit';
               params.ExpressionAttributeValues[':userLimit'] = userLimit;
            }

            return req.app.locals.docClient.update(params).promise();
         })
         .then(() => {
            resolve(
               _.merge({}, subscriberOrg, {
                  name,
                  icon,
                  enabled,
                  lastModified,
                  preferences,
                  userLimit
               })
            );
         })
         .catch(err => reject(err));
   });
};
