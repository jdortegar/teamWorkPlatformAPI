import config from '../../config/env';
import * as util from './util';

/**
 * hash: teamMemberId
 * v
 * userId
 * teamId
 * subscriberUserId
 * subscriberOrgId
 * role
 * enabled
 * created
 * lastModified
 *
 * GSI: teamIdUserIdIdx
 * hash: teamId
 * range: userId
 *
 * GSI: userIdSubscriberOrgIdIdx
 * hash: userId
 * range: subscriberOrgId
 */
const tableName = () => {
   return `${config.tablePrefix}teamMembers`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const createTeamMember = (req, teamMemberId, userId, teamId, subscriberUserId, subscriberOrgId, role) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            teamMemberId,
            v,
            userId,
            teamId,
            subscriberUserId,
            subscriberOrgId,
            role,
            enabled: true,
            created: req.now.format(),
            lastModified: req.now.format()
         }
      };

      req.app.locals.docClient.put(params).promise()
         .then(result => resolve(result.$response.request.rawParams.Item))
         .catch(err => reject(err));
   });
};

export const getTeamMemberByTeamMemberId = (req, teamMemberId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'teamMemberId = :teamMemberId',
         ExpressionAttributeValues: {
            ':teamMemberId': teamMemberId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getTeamMembersByTeamId = (req, teamId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'teamIdUserIdIdx',
         KeyConditionExpression: 'teamId = :teamId',
         ExpressionAttributeValues: {
            ':teamId': teamId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getTeamMemberByTeamIdAndUserId = (req, teamId, userId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'teamIdUserIdIdx',
         KeyConditionExpression: 'teamId = :teamId and userId = :userId',
         ExpressionAttributeValues: {
            ':teamId': teamId,
            ':userId': userId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getTeamMemberByTeamIdAndUserIdAndRole = (req, teamId, userId, role) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'teamIdUserIdIdx',
         KeyConditionExpression: 'teamId = :teamId and userId = :userId',
         FilterExpression: '#role = :role',
         ExpressionAttributeNames: {
            '#role': 'role'
         },
         ExpressionAttributeValues: {
            ':teamId': teamId,
            ':userId': userId,
            ':role': role
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getTeamMembersByTeamIdAndRole = (req, teamId, role) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'teamIdUserIdIdx',
         KeyConditionExpression: 'teamId = :teamId',
         FilterExpression: '#role = :role',
         ExpressionAttributeNames: {
            '#role': 'role'
         },
         ExpressionAttributeValues: {
            ':teamId': teamId,
            ':role': role
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getTeamMembersByUserId = (req, userId) => {
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

export const getTeamMembersByUserIdAndSubscriberOrgId = (req, userId, subscriberOrgId) => {
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
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};
