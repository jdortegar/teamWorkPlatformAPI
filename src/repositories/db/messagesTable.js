import _ from 'lodash';
import config from '../../config/env';
import * as util from './util';

/**
 * hash: conversationId
 * range: messageId
 * v
 * level
 * path
 * topic
 * content: []
 * messageNumber
 * messageCount (> 0 means this is a parent of thread)
 * lastCreated (optional.  Only if there's messages in this thread)
 * byteCount
 * createdBy
 * created
 * lastModified
 * replyTo (optional)
 * sharedData
 * deleted
 * history: { created: content, ... } (optional)
 * likes
 * dislikes
 * flags
 *
 * LSI: conversationIdCreatedIdx
 * hash: conversationId
 * range: created
 *
 * LSI: conversationIdLevelIdx
 * hash: conversationId
 * range: level
 *
 * LSI: conversationIdMessageCountIdx
 * hash: conversationId
 * range: messageCount
 */
const tableName = () => {
   return `${config.tablePrefix}messages`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const createMessage = (req, conversationId, messageId, level, path, content, messageNumber, byteCount, createdBy, replyTo = undefined, sharedData) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            conversationId,
            messageId,
            v,
            level,
            path,
            topic: null,
            content,
            messageNumber,
            messageCount: 0,
            byteCount,
            createdBy,
            created: req.now.format(),
            lastModified: req.now.format(),
            replyTo,
            deleted: false,
            likes: 0,
            dislikes: 0,
            flags: 0,
            sharedData
         }
      };

      req.app.locals.docClient.put(params).promise()
         .then(result => resolve(result.$response.request.rawParams.Item))
         .catch(err => reject(err));
   });
};

export const getMessageByConversationIdAndMessageId = (req, conversationId, messageId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'conversationId = :conversationId and messageId = :messageId',
         ExpressionAttributeValues: {
            ':conversationId': conversationId,
            ':messageId': messageId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults && latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getParentMessagesByConversationId = (req, conversationId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'conversationIdMessageCountIdx',
         KeyConditionExpression: 'conversationId = :conversationId and messageCount > :messageCount',
         ExpressionAttributeValues: {
            ':conversationId': conversationId,
            ':messageCount': 0
         }
      };

      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getMessagesByConversationIdFiltered = (req, conversationId, { since, until, minLevel, maxLevel }) => {
   return new Promise((resolve, reject) => {
      let params;
      if ((since) || (until)) {
         params = {
            TableName: tableName(),
            IndexName: 'conversationIdCreatedIdx',
            KeyConditionExpression: 'conversationId = :conversationId',
            ExpressionAttributeValues: {
               ':conversationId': conversationId
            }
         };
         if (since) {
            params.KeyConditionExpression += ' and created >= :since';
            params.ExpressionAttributeValues[':since'] = since;
         }
         if (until) {
            params.KeyConditionExpression += ' and created <= :until';
            params.ExpressionAttributeValues[':until'] = until;
         }
         if (minLevel) {
            params.ExpressionAttributeNames = { '#level': 'level' };
            params.FilterExpression = '#level >= :minLevel';
            params.ExpressionAttributeValues[':minLevel'] = minLevel;
         }
         if (maxLevel) {
            if (params.FilterExpression) {
               params.FilterExpression += ' and #level <= :maxLevel';
            } else {
               params.ExpressionAttributeNames = { '#level': 'level' };
               params.FilterExpression = 'level <= :maxLevel';
            }
            params.ExpressionAttributeValues[':maxLevel'] = maxLevel;
         }
      } else {
         params = {
            TableName: tableName(),
            IndexName: 'conversationIdLevelIdx',
            KeyConditionExpression: 'conversationId = :conversationId',
            ExpressionAttributeValues: {
               ':conversationId': conversationId
            }
         };
         if (minLevel) {
            params.ExpressionAttributeNames = { '#level': 'level' };
            params.KeyConditionExpression += ' and #level >= :minLevel';
            params.ExpressionAttributeValues[':minLevel'] = minLevel;
         }
         if (maxLevel) {
            params.ExpressionAttributeNames = { '#level': 'level' };
            params.KeyConditionExpression += ' and level <= :maxLevel';
            params.ExpressionAttributeValues[':maxLevel'] = maxLevel;
         }
      }

      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

const updateMessageMessageCount = (req, conversationId, messageId, messageCount) => {
   const params = {
      TableName: tableName(),
      Key: { conversationId, messageId },
      UpdateExpression: 'set messageCount = :messageCount, lastCreated = :lastCreated',
      ConditionExpression: 'messageCount = :currentMessageCount',
      ExpressionAttributeValues: {
         ':currentMessageCount': messageCount - 1,
         ':messageCount': messageCount,
         ':lastCreated': req.now.format()
      }
   };

   return req.app.locals.docClient.update(params).promise();
};

export const incrementMessageMessageCount = (req, conversationId, messageId) => {
   return new Promise((resolve) => {
      let message;
      getMessageByConversationIdAndMessageId(req, conversationId, messageId)
         .then((retrievedMessage) => {
            message = retrievedMessage;
            const { messageCount } = message;
            return updateMessageMessageCount(req, conversationId, messageId, messageCount + 1);
         })
         .then(() => {
            message.messageCount += 1;
            message.lastCreated = req.now.format();
            resolve(message);
         })
         .catch(() => incrementMessageMessageCount(req, conversationId, messageId))
         .then(updatedMessage => resolve(updatedMessage));
   });
};

export const updateMessageContent = (req, message, content, byteCount) => {
   return new Promise((resolve, reject) => {
      const updatedMessage = _.cloneDeep(message);
      let { history } = message;
      if (!history) {
         history = {};
         updatedMessage.history = history;
      }

      history[updatedMessage.lastModified] = updatedMessage.content;
      updatedMessage.byteCount = 0;
      updatedMessage.content = content;
      updatedMessage.lastModified = req.now.format();
      const { conversationId, messageId } = updatedMessage;

      const params = {
         TableName: tableName(),
         Key: { conversationId, messageId },
         UpdateExpression: 'set history = :history, byteCount = :byteCount, content = :content, lastModified = :lastModified',
         ExpressionAttributeValues: {
            ':history': history,
            ':byteCount': byteCount,
            ':content': content,
            ':lastModified': updatedMessage.lastModified
         }
      };

      req.app.locals.docClient.update(params).promise()
         .then(() => resolve(updatedMessage))
         .catch(err => reject(err));
   });
};

export const deleteMessage = (req, conversationId, messageId) => {
   return new Promise((resolve, reject) => {
      let message;
      getMessageByConversationIdAndMessageId(req, conversationId, messageId)
         .then((retrievedMessage) => {
            message = retrievedMessage;
            let { history } = message;
            if (!history) {
               history = {};
               message.history = history;
            }

            history[message.lastModified] = message.content;
            message.byteCount = 0;
            message.content = [];
            message.deleted = true;
            message.lastModified = req.now.format();

            const params = {
               TableName: tableName(),
               Key: { conversationId, messageId },
               UpdateExpression: 'set history = :history, content = :content, byteCount = :byteCount, lastModified = :lastModified, deleted = :deleted',
               ExpressionAttributeValues: {
                  ':history': history,
                  ':content': message.content,
                  ':byteCount': message.byteCount,
                  ':lastModified': message.lastModified,
                  ':deleted': message.deleted,
               }
            };

            return req.app.locals.docClient.update(params).promise();
         })
         .then(() => resolve(message))
         .catch(err => reject(err));
   });
};

export const updateMessageLikes = (req, conversationId, messageId, like) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Key: { conversationId, messageId },
         AttributeUpdates: {
            likes: {
               Action: 'ADD',
               Value: (like) ? 1 : -1
            }
         }
      };

      req.app.locals.docClient.update(params).promise()
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

export const updateMessageDislikes = (req, conversationId, messageId, dislike) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Key: { conversationId, messageId },
         AttributeUpdates: {
            dislikes: {
               Action: 'ADD',
               Value: (dislike) ? 1 : -1
            }
         }
      };

      req.app.locals.docClient.update(params).promise()
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

export const updateMessageFlags = (req, conversationId, messageId, flag) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Key: { conversationId, messageId },
         AttributeUpdates: {
            flags: {
               Action: 'ADD',
               Value: (flag) ? 1 : -1
            }
         }
      };

      req.app.locals.docClient.update(params).promise()
         .then(() => resolve())
         .catch(err => reject(err));
   });
};
