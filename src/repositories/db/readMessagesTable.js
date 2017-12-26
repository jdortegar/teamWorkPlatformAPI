import config from '../../config/env';
import * as util from './util';

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
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            userId,
            conversationId,
            v,
            lastReadMessageCount: 0,
            lastReadTimestamp: '0000-00-00T00:00:00Z',
            parentMessageIds: {}
         }
      };

      req.app.locals.docClient.put(params).promise()
         .then(result => resolve(result.$response.request.rawParams.Item))
         .catch(err => reject(err));
   });
};

export const updateReadMessages = (req, userId, conversationId, lastReadTimestamp, lastReadMessageCount, parentMessageId = undefined) => {
   const params = {
      TableName: tableName(),
      Key: { userId, conversationId },
      ExpressionAttributeValues: {}
   };

   if (parentMessageId) {
      params.UpdateExpression = 'set parentMessageIds.#parentMessageId = :parentMessageIdValues';
      params.ExpressionAttributeNames = {
         '#parentMessageId': parentMessageId
      };
      params.ExpressionAttributeValues[':parentMessageIdValues'] = { lastReadTimestamp, lastReadMessageCount };
   } else {
      params.UpdateExpression = 'set lastReadTimestamp = :lastReadTimestamp, lastReadMessageCount = :lastReadMessageCount';
      params.ExpressionAttributeValues[':lastReadTimestamp'] = lastReadTimestamp;
      params.ExpressionAttributeValues[':lastReadMessageCount'] = lastReadMessageCount;
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
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : []))
         .catch(err => reject(err));
   });
};
