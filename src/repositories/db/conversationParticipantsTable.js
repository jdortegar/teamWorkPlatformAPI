import config from '../../config/env/index';
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
 * Index: conversationParticipantsUserIdConversationIdIdx
 * hash: userId
 * range: conversationId
 *
 * Index: conversationParticipantsTeamRoomIdUserIdIdx
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

   return req.app.locals.docClient.put(params).promise();
};

export const getConversationParticipantsByConversationId = (req, conversationId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'conversationId = :v1',
         ExpressionAttributeValues: {
            ':v1': conversationId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getConversationParticipantsByUserId = (req, userId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'conversationParticipantsUserIdConversationIdIdx',
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
         IndexName: 'conversationParticipantsTeamRoomIdUserIdIdx',
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
