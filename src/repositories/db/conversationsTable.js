import config from '../../config/env';
import * as util from './util';

/**
 * hash: conversationId
 * v
 * subscriberOrgId
 * teamId
 * topic
 * active
 * messageCount
 * byteCount
 * lastCreated (optional.  Only if there's messages in this thread)
 * created
 * lastModified
 *
 * GSI: teamIdIdx
 * hash: teamId
 */
const tableName = () => {
   return `${config.tablePrefix}conversations`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const createConversation = (req, conversationId, subscriberOrgId, teamId = undefined, topic = undefined) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            conversationId,
            v,
            subscriberOrgId,
            teamId,
            topic: topic || null,
            active: true,
            messageCount: 0,
            byteCount: 0,
            created: req.now.format(),
            lastModified: req.now.format()
         }
      };

      req.app.locals.docClient.put(params).promise()
         .then(result => resolve(result.$response.request.rawParams.Item))
         .catch(err => reject(err));
   });
};

export const updateConversationTopic = (req, conversationId, topic) => {
   const params = {
      TableName: tableName(),
      Key: { conversationId },
      UpdateExpression: 'set topic = :topic, lastModified = :lastModified',
      ExpressionAttributeValues: {
         ':topic': topic,
         ':lastModified': req.now.format()
      }
   };

   return req.app.locals.docClient.update(params).promise();
};

export const updateConversationActive = (req, conversationId, active) => {
   const params = {
      TableName: tableName(),
      Key: { conversationId },
      UpdateExpression: 'set active = :active, lastModified = :lastModified',
      ExpressionAttributeValues: {
         ':active': active,
         ':lastModified': req.now.format()
      }
   };

   return req.app.locals.docClient.update(params).promise();
};

export const getConversationByConversationId = (req, conversationId) => {
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
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

const updateConversationMessageCountAndByteCount = (req, conversationId, currentMessageCount, newMessageCount, byteCount) => {
   const params = {
      TableName: tableName(),
      Key: { conversationId },
      UpdateExpression: 'set messageCount = :messageCount, byteCount = :byteCount, lastCreated = :lastCreated',
      ConditionExpression: 'messageCount = :currentMessageCount',
      ExpressionAttributeValues: {
         ':currentMessageCount': currentMessageCount,
         ':messageCount': newMessageCount,
         ':byteCount': byteCount,
         ':lastCreated': req.now.format()
      }
   };

   return req.app.locals.docClient.update(params).promise();
};

export const incrementConversationByteCount = (req, conversationId, byteCount) => {
   return new Promise((resolve) => {
      let conversation;
      getConversationByConversationId(req, conversationId)
         .then((retrievedConversation) => {
            conversation = retrievedConversation;
            const { messageCount } = conversation;
            return updateConversationMessageCountAndByteCount(req, conversationId, messageCount, messageCount, conversation.byteCount + byteCount);
         })
         .then(() => {
            conversation.byteCount += byteCount;
            conversation.lastCreated = req.now.format();
            resolve(conversation);
         })
         .catch(() => incrementConversationByteCount(req, conversationId, byteCount))
         .then(updatedConversation => resolve(updatedConversation));
   });
};

export const incrementConversationMessageCountAndByteCount = (req, conversationId, byteCount) => {
   return new Promise((resolve) => {
      let conversation;
      getConversationByConversationId(req, conversationId)
         .then((retrievedConversation) => {
            conversation = retrievedConversation;
            const { messageCount } = conversation;
            return updateConversationMessageCountAndByteCount(req, conversationId, messageCount, messageCount + 1, conversation.byteCount + byteCount);
         })
         .then(() => {
            conversation.messageCount += 1;
            conversation.byteCount += byteCount;
            conversation.lastCreated = req.now.format();
            resolve(conversation);
         })
         .catch(() => incrementConversationMessageCountAndByteCount(req, conversationId, byteCount))
         .then(updatedConversation => resolve(updatedConversation));
   });
};

export const getConversationsByConversationIds = (req, conversationIds) => {
   return new Promise((resolve, reject) => {
      const promises = conversationIds.map(conversationId => getConversationByConversationId(req, conversationId));
      Promise.all(promises)
         .then(conversations => resolve(conversations))
         .catch(err => reject(err));
   });
};

export const getConversationByTeamId = (req, teamId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'teamIdIdx',
         KeyConditionExpression: 'teamId = :teamId',
         ExpressionAttributeValues: {
            ':teamId': teamId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};
