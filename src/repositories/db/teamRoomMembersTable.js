import config from '../../config/env';
import * as util from './util';

/**
 * hash: teamRoomMemberId
 * v
 * userId
 * teamRoomId
 * teamMemberId
 * teamId
 * subscriberUserId
 * subscriberOrgId
 * role
 * enabled
 * created
 * lastModified
 *
 * GSI: teamRoomIdUserIdIdx
 * hash: teamRoomId
 * range: userId
 *
 * GSI: userIdTeamIdIdx
 * hash: userId
 * range: teamId
 */
const tableName = () => {
   return `${config.tablePrefix}teamRoomMembers`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const createTeamRoomMember = (req, teamRoomMemberId, userId, teamRoomId, teamMemberId, teamId, subscriberUserId, subscriberOrgId, role) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            teamRoomMemberId,
            v,
            userId,
            teamRoomId,
            teamMemberId,
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

export const getTeamRoomMembersByTeamRoomId = (req, teamRoomId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'teamRoomIdUserIdIdx',
         KeyConditionExpression: 'teamRoomId = :teamRoomId',
         ExpressionAttributeValues: {
            ':teamRoomId': teamRoomId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getTeamRoomMemberByTeamRoomIdAndUserId = (req, teamRoomId, userId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'teamRoomIdUserIdIdx',
         KeyConditionExpression: 'teamRoomId = :teamRoomId and userId = :userId',
         ExpressionAttributeValues: {
            ':teamRoomId': teamRoomId,
            ':userId': userId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getTeamRoomMemberByTeamRoomIdAndUserIdAndRole = (req, teamRoomId, userId, role) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'teamRoomIdUserIdIdx',
         KeyConditionExpression: 'teamRoomId = :teamRoomId and userId = :userId',
         FilterExpression: '#role = :role',
         ExpressionAttributeNames: {
            '#role': 'role'
         },
         ExpressionAttributeValues: {
            ':teamRoomId': teamRoomId,
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

export const getTeamRoomMembersByUserId = (req, userId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'userIdTeamIdIdx',
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

export const getTeamRoomMembersByUserIdAndTeamId = (req, userId, teamId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'userIdTeamIdIdx',
         KeyConditionExpression: 'userId = :userId and teamId = :teamId',
         ExpressionAttributeValues: {
            ':userId': userId,
            ':teamId': teamId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getTeamRoomMembersByUserIdsAndTeamRoomId = (req, userIds, teamRoomId) => {
   return userIds.map(userId => getTeamRoomMemberByTeamRoomIdAndUserId(req, teamRoomId, userId));
};

export const getTeamRoomMembersByUserIdAndSubscriberOrgId = (req, userId, subscriberOrgId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'userIdTeamIdIdx',
         KeyConditionExpression: 'userId = :userId',
         FilterExpression: 'subscriberOrgId >= :subscriberOrgId',
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
