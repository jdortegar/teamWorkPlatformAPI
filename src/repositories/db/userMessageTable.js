import config from '../../config/env';
import * as util from './util';

/**
 * hash: userId
 * range: messageId
 * v
 * conversationId
 * like
 * dislike
 * flag
 *
 * GSI: messageIdUserIdIdx
 * hash: messageId
 * range: userId
 */
const tableName = () => {
   return `${config.tablePrefix}userMessage`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const createUserMessage = (req, userId, messageId, conversationId, { like = false, dislike = false, flag = false }) => {
   const isLike = (like);
   const isDislike = (dislike);
   const isFlag = (flag);
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            userId,
            messageId,
            v,
            conversationId,
            like: isLike,
            dislike: isDislike,
            flag: isFlag
         }
      };

      req.app.locals.docClient.put(params).promise()
         .then(result => resolve(result.$response.request.rawParams.Item))
         .catch(err => reject(err));
   });
};

export const getUserMessageByUserIdAndMessageId = (req, userId, messageId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'userId = :userId and messageId = :messageId',
         ExpressionAttributeValues: {
            ':userId': userId,
            ':messageId': messageId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults && latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const likeMessage = (req, userId, messageId, like = true) => {
   const params = {
      TableName: tableName(),
      Key: { userId, messageId },
      UpdateExpression: 'set like = :like',
      ExpressionAttributeValues: {
         ':like': like
      }
   };

   return req.app.locals.docClient.update(params).promise();
};

export const dislikeMessage = (req, messageId, userId, dislike = true) => {
   const params = {
      TableName: tableName(),
      Key: { userId, messageId },
      UpdateExpression: 'set dislike = :dislike',
      ExpressionAttributeValues: {
         ':dislike': dislike
      }
   };

   return req.app.locals.docClient.update(params).promise();
};

export const flagMessage = (req, messageId, userId, flag = true) => {
   const params = {
      TableName: tableName(),
      Key: { userId, messageId },
      UpdateExpression: 'set flag = :flag',
      ExpressionAttributeValues: {
         ':flag': flag
      }
   };

   return req.app.locals.docClient.update(params).promise();
};
