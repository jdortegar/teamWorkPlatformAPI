import _ from 'lodash';
import config from '../../config/env';
import * as util from './util';

/**
 * hash: subscriberUserId
 * v
 * userId
 * subscriberOrgId
 * role
 * enabled
 * displayName
 * integrations
 * created
 * lastModified
 *
 * GSI: userIdSubscriberOrgIdIdx
 * hash: userId
 * range: subscriberOrgId
 *
 * GSI: subscriberOrgIdUserIdIdx
 * hash: subscriberOrgId
 * range: userId
 */
const tableName = () => {
   return `${config.tablePrefix}subscriberUsers`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const createSubscriberUser = (req, subscriberUserId, userId, subscriberOrgId, role, displayName) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            subscriberUserId,
            v,
            userId,
            subscriberOrgId,
            role,
            enabled: true,
            displayName,
            created: req.now.format(),
            lastModified: req.now.format()
         }
      };

      req.app.locals.docClient.put(params).promise()
         .then(result => resolve(result.$response.request.rawParams.Item))
         .catch(err => reject(err));
   });
};

export const getSubscriberUserBySubscriberUserId = (req, subscriberUserId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'subscriberUserId = :subscriberUserId',
         ExpressionAttributeValues: {
            ':subscriberUserId': subscriberUserId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getSubscriberUsersByUserId = (req, userId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'userIdSubscriberOrgIdIdx',
         KeyConditionExpression: 'userId = :userId',
         ExpressionAttributeValues: {
            ':userId': userId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getSubscriberUserByUserIdAndSubscriberOrgId = (req, userId, subscriberOrgId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'userIdSubscriberOrgIdIdx',
         KeyConditionExpression: 'userId = :userId and subscriberOrgId = :subscriberOrgId',
         ExpressionAttributeValues: {
            ':userId': userId,
            ':subscriberOrgId': subscriberOrgId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getSubscriberUsersByUserIdsAndSubscriberOrgId = (req, userIds, subscriberOrgId) => {
   return Promise.all(userIds.map(userId => getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)));
};

export const getSubscriberUserByUserIdAndSubscriberOrgIdAndRole = (req, userId, subscriberOrgId, role) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'userIdSubscriberOrgIdIdx',
         KeyConditionExpression: 'userId = :userId and subscriberOrgId = :subscriberOrgId',
         FilterExpression: '#role = :role',
         ExpressionAttributeNames: {
            '#role': 'role'
         },
         ExpressionAttributeValues: {
            ':userId': userId,
            ':subscriberOrgId': subscriberOrgId,
            ':role': role
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getSubscriberUsersBySubscriberOrgId = (req, subscriberOrgId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'subscriberOrgIdUserIdIdx',
         KeyConditionExpression: 'subscriberOrgId = :subscriberOrgId',
         ExpressionAttributeValues: {
            ':subscriberOrgId': subscriberOrgId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getSubscriberUsersBySubscriberOrgIdAndRole = (req, subscriberOrgId, role) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'subscriberOrgIdUserIdIdx',
         KeyConditionExpression: 'subscriberOrgId = :subscriberOrgId',
         FilterExpression: '#role = :role',
         ExpressionAttributeNames: {
            '#role': 'role'
         },
         ExpressionAttributeValues: {
            ':subscriberOrgId': subscriberOrgId,
            ':role': role
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const updateSubscriberUserIntegrations = (req, subscriberUserId, integrations) => {
   return new Promise((resolve, reject) => {
      const lastModified = req.now.format();
      let subscriberUser;
      getSubscriberUserBySubscriberUserId(req, subscriberUserId)
         .then((retrievedSubscriberUser) => {
            subscriberUser = retrievedSubscriberUser;

            const params = {
               TableName: tableName(),
               Key: { subscriberUserId },
               UpdateExpression: 'set lastModified = :lastModified, integrations = :integrations',
               ExpressionAttributeValues: {
                  ':lastModified': lastModified,
                  ':integrations': integrations
               }
            };

            return req.app.locals.docClient.update(params).promise();
         })
         .then(() => {
            delete subscriberUser.integrations;
            resolve(_.merge({}, subscriberUser, {
               integrations,
               lastModified
            }));
         })
         .catch(err => reject(err));
   });
};
