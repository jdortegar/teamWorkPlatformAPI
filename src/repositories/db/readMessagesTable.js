import config from '../../config/env';
import * as util from '../../services/util';

/**
 * hash: userId
 * range: conversationId
 * v
 * lastReadTimestamp
 * lastReadMessageCount
 * parentMessageIds: { messageId1: { lastReadTimestamp, lastReadMessageCount }, ... }
 */
const tableName = () => {
   return `${config.tablePrefix}readMessages`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const createReadMessages = (req, userId, conversationId) => {
   const params = {
      TableName: tableName(),
      Item: {
         userId,
         conversationId,
         v,
         lastReadMessageCount: 0,
         lastReadTimestamp: req.now.format(),
         parentMessageIds: {}
      }
   };

   return req.app.locals.docClient.put(params).promise();
};

export const updateReadMessages = (req, userId, conversationId, lastReadTimestamp, lastReadMessageCount, parentMessageId = undefined) => {
   const params = {
      TableName: tableName(),
      Key: { userId },
      ConditionExpression: 'conversationId = :conversationId'
   };
   if (parentMessageId) {
      params.UpdateExpression = 'set parentMessageIds.#parentMessageId = :parentMessageIdValues';
      params.ExpressionAttributeNames = {
         '#parentMessageId': parentMessageId
      };
      params.ExpressionAttributeValues = {
         ':parentMessageIdValues': { lastReadTimestamp, lastReadMessageCount }
      };
   } else {
      params.UpdateExpression = 'set lastReadTimestamp = #lastReadTimestamp, lastReadMessageCount = #lastReadMessageCount';
      params.ExpressionAttributeValues = {
         ':conversationId': conversationId,
         ':lastReadMessageCount': lastReadMessageCount,
         ':lastReadTimestamp': lastReadTimestamp
      };
   }

   return req.app.locals.docClient.update(params).promise();
};

export const getReadMessagesByUserId = (req, userId) => {
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
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getReadMessagesByUserIdAndConversationId = (req, userId, conversationId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'userId = :userId and conversationId = :conversationId',
         ExpressionAttributeValues: {
            ':userId': userId,
            ':conversationId': conversationId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? [latestResults] : []))
         .catch(err => reject(err));
   });
};
