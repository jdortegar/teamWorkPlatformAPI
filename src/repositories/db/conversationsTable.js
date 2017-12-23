import config from '../../config/env';
import * as util from './util';

/**
 * hash: conversationId
 * v
 * subscriberOrgId
 * teamRoomId
 * active
 * messageCount
 * created
 * lastModified
 *
 * Index: teamRoomIdIdx
 * hash: teamRoomId
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

export const createConversation = (req, conversationId, subscriberOrgId, teamRoomId = undefined) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            conversationId,
            v,
            subscriberOrgId,
            teamRoomId,
            active: true,
            messageCount: 0,
            created: req.now.format(),
            lastModified: req.now.format()
         }
      };

      req.app.locals.docClient.put(params).promise()
         .then(result => resolve(result.$response.request.rawParams.Item))
         .catch(err => reject(err));
   });
};

export const updateConversationActive = (req, conversationId, active) => {
   const params = {
      TableName: tableName(),
      Key: { conversationId },
      UpdateExpression: 'set active = :active',
      ExpressionAttributeValues: {
         ':active': active
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

const updateConversationMessageCount = (req, conversationId, messageCount) => {
   const params = {
      TableName: tableName(),
      Key: { conversationId },
      UpdateExpression: 'set messageCount = :messageCount',
      ConditionExpression: 'messageCount = :currentMessageCount',
      ExpressionAttributeValues: {
         ':currentMessageCount': messageCount - 1,
         ':messageCount': messageCount
      }
   };

   return req.app.locals.docClient.update(params).promise();
};

export const incrementConversationMessageCount = (req, conversationId) => {
   return new Promise((resolve) => {
      let conversation;
      getConversationByConversationId(req, conversationId)
         .then((retrievedConversation) => {
            conversation = retrievedConversation;
            const { messageCount } = conversation;
            return updateConversationMessageCount(req, conversationId, messageCount + 1);
         })
         .then(() => {
            conversation.messageCount += 1;
            resolve(conversation);
         })
         .catch(() => incrementConversationMessageCount(req, conversationId))
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

export const getConversationByTeamRoomId = (req, teamRoomId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'teamRoomIdIdx',
         KeyConditionExpression: 'teamRoomId = :teamRoomId',
         ExpressionAttributeValues: {
            ':teamRoomId': teamRoomId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};
