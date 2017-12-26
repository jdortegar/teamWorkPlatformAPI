import config from '../../config/env';
import * as util from './util';

/**
 * hash: conversationId
 * range: userId
 * v
 * conversationId
 * userId
 * teamRoomId (optional)
 * created
 * lastModified
 *
 * GSI: userIdConversationIdIdx
 * hash: userId
 * range: conversationId
 *
 * GSI: teamRoomIdUserIdIdx
 * hash: teamRoomId
 * range: userId
 *
 * @returns {string}
 */
const tableName = () => {
   return `${config.tablePrefix}conversationParticipants`;
};

// Schema Version for conversationParticipants table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const createConversationParticipant = (req, conversationId, userId, teamRoomId = undefined) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            conversationId,
            userId,
            v,
            teamRoomId,
            created: req.now.format(),
            lastModified: req.now.format()
         }
      };

      req.app.locals.docClient.put(params).promise()
         .then(result => resolve(result.$response.request.rawParams.Item))
         .catch(err => reject(err));
   });
};

export const getConversationParticipantsByConversationId = (req, conversationId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'conversationId = :conversationId',
         ExpressionAttributeValues: {
            ':conversationId': conversationId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getConversationParticipantByConversationIdAndUserId = (req, conversationId, userId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'conversationId = :conversationId and userId = :userId',
         ExpressionAttributeValues: {
            ':conversationId': conversationId,
            ':userId': userId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults && latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getConversationParticipantsByUserId = (req, userId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'userIdConversationIdIdx',
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

export const getConversationParticipantsByTeamRoomId = (req, teamRoomId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'teamRoomIdUserIdIdx',
         KeyConditionExpression: 'teamRoomId = :teamRoomId',
         ExpressionAttributeValues: {
            ':teamRoomId': teamRoomId
         }
      };
      req.app.locals.docClient.get(params).promise()
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};
