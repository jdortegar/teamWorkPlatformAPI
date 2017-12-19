import config from '../config/env';
import * as util from './util';

const tableName = () => {
   return `${config.tablePrefix}messages`;
};

// Schema Version for messages table.
const v = 1;

const persistUpgradedDbObject = (req, upgradedDbObject) => {
   const updateInfo = upgradedDbObject.messageInfo;
   return util.updateItemCompletely(req, -1, `${config.tablePrefix}messages`, 'messageId', upgradedDbObject.messageId, { messageInfo: updateInfo }, upgradedDbObject.v);
};

const upgradeSchema = (req, dbObjects) => {
   return new Promise((resolve, reject) => {
      const upgradePromises = [];
      const upgradedDbObjects = [];
      dbObjects.forEach((dbObject) => {
         let schemaVersion = dbObject.v;
         let upgradedDbObject;

         // TODO: deprecated in v1.
         // Make sure "v" field exists.
         if (!dbObject.v) {
            schemaVersion = 0;
            upgradedDbObject = dbObject;
            upgradedDbObject.v = 0;
         }

         if (schemaVersion < v) {
            // Upgrade from 0 -> 1 if necessary.
            if (schemaVersion === 0) {
               upgradedDbObject = upgradedDbObject || dbObject;
               // Convert fields messageType/text to content.
               upgradedDbObject.messageInfo.content = [];
               upgradedDbObject.messageInfo.content.push({ type: 'text/plain', text: upgradedDbObject.messageInfo.text });
               delete upgradedDbObject.messageInfo.messageType;
               delete upgradedDbObject.messageInfo.text;
               schemaVersion = 1;
            }
         }

         // Persist upgrade if necessary.
         if (upgradedDbObject) {
            upgradedDbObject.v = schemaVersion;
            upgradedDbObjects.push(upgradedDbObject);
            upgradePromises.push(persistUpgradedDbObject(req, upgradedDbObject)); // Persist upgrade.
         } else {
            upgradedDbObjects.push(dbObject);
         }
      });

      if (upgradePromises.length > 0) {
         Promise.all(upgradePromises)
            .then(() => resolve(upgradedDbObjects))
            .catch(err => reject(err));
      } else {
         resolve(upgradedDbObjects);
      }
   });
};

// Start Proxies to intercept and upgrade schema version.
const batchGetItemBySortKey = (req, table, sortKeyName, sortKeys) => {
   return new Promise((resolve, reject) => {
      util.batchGetItemBySortKey(req, table, sortKeyName, sortKeys)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

const scan = (req, params) => {
   return new Promise((resolve, reject) => {
      util.scan(params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};
// End Proxies to intercept and upgrade schema version.

export const createMessageInDb = (req, partitionId, messageId, message) => {
   const params = {
      TableName: tableName(),
      Item: {
         partitionId,
         messageId,
         v,
         messageInfo: message
      }
   };

   return util.docClient().put(params).promise();
};


export const getMessageById = (req, messageId) => {
   if (messageId === undefined) {
      return Promise.reject('messageId needs to be specified.');
   }

   return batchGetItemBySortKey(req, tableName(), 'messageId', [messageId]);
};

// filter = { since, until, minLevel, maxLevel }
export const getMessagesByConversationIdFiltered = (req, conversationId, filter) => {
   if (conversationId === undefined) {
      return Promise.reject('conversationId needs to be specified.');
   }

   const { since, until, minLevel, maxLevel } = filter;
   let nIdx = 0;
   let vIdx = 0;

   // Add 'conversationId' to filter.
   let filterExpression = '(#n1.#n2 IN (:v1))';
   const queryNames = {
      '#n1': 'messageInfo',
      '#n2': 'conversationId'
   };
   nIdx += 2;
   const queryValues = {
      ':v1': conversationId
   };
   vIdx += 1;

   // Add 'since' to filter.
   if (since) {
      nIdx += 1;
      vIdx += 1;
      filterExpression += ` AND (#n1.#n${nIdx} >= :v${vIdx})`;
      queryNames[`#n${nIdx}`] = 'created';
      queryValues[`:v${vIdx}`] = since;
   }

   // Add 'until' to filter.
   if (until) {
      nIdx += 1;
      vIdx += 1;
      filterExpression += ` AND (#n1.#n${nIdx} <= :v${vIdx})`;
      queryNames[`#n${nIdx}`] = 'created';
      queryValues[`:v${vIdx}`] = until;
   }

   // Add 'minLevel' to filter.
   if (typeof minLevel !== 'undefined') {
      nIdx += 1;
      vIdx += 1;
      filterExpression += ` AND (#n1.#n${nIdx} >= :v${vIdx})`;
      queryNames[`#n${nIdx}`] = 'level';
      queryValues[`:v${vIdx}`] = minLevel;
   }

   // Add 'maxLevel' to filter.
   if (typeof maxLevel !== 'undefined') {
      nIdx += 1;
      vIdx += 1;
      filterExpression += ` AND (#n1.#n${nIdx} <= :v${vIdx})`;
      queryNames[`#n${nIdx}`] = 'level';
      queryValues[`:v${vIdx}`] = maxLevel;
   }

   const params = {
      TableName: tableName(),
      FilterExpression: filterExpression,
      ExpressionAttributeNames: queryNames,
      ExpressionAttributeValues: queryValues
   };
   return scan(req, params);
};
