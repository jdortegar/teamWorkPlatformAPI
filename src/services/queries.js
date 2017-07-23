import AWS from 'aws-sdk';
import _ from 'lodash';
import config from '../config/env';

let _docClient;

function docClient() {
   if (_docClient === undefined) {
      _docClient = new AWS.DynamoDB.DocumentClient();
   }
   return _docClient;
}


function removeIntermediateDataType(obj) {
   if (typeof obj !== 'object') {
      return obj;
   }

   let ret;
   const objKeys = Object.keys(obj);
   if (objKeys.length !== 1) {
      ret = {};
      objKeys.forEach((objKey) => {
         ret[objKey] = removeIntermediateDataType(obj[objKey]);
      });
      return ret;
   }
   const objKey = objKeys[0];
   const value = obj[objKey];
   switch (objKey) {
      case 'N':
         return Number(value);
      case 'M':
         ret = {};
         Object.keys(value).forEach((subKey) => {
            ret[subKey] = removeIntermediateDataType(value[subKey]);
         });
         return ret;
      case 'S':
         return value;
      case 'BOOL':
         return Boolean(value);
      case 'NULL':
         return null;
      default:
         ret = {};
         ret[objKey] = removeIntermediateDataType(value);
         return ret;
   }
}

function removeIntermediateDataTypeFromArray(arr) {
   const ret = [];
   arr.forEach(item => ret.push(removeIntermediateDataType(item)));
   return ret;
}


function batchGetItemBySortKey(req, tableName, sortKeyName, sortKeys) {
   if ((sortKeys === undefined) || (sortKeys.length === 0)) {
      return Promise.resolve([]);
   }

   const dynamoDb = req.app.locals.db;

   const requestItemKeys = sortKeys.map((sortKey) => {
      const requestItemKey = { partitionId: { N: '-1' } };
      requestItemKey[sortKeyName] = { S: sortKey };
      return requestItemKey;
   });
   const params = { RequestItems: {} };
   params.RequestItems[tableName] = { Keys: requestItemKeys };

   return new Promise((resolve, reject) => {
      dynamoDb.batchGetItem(params).promise()
         .then((data) => {
            const items = removeIntermediateDataTypeFromArray(data.Responses[tableName]);
            resolve(items);
         })
         .catch((err) => {
            reject(err);
         });
   });
}

class ObjectExpressions {
   nameVariables = {};
   valueVariables = {};
   sets = {};
   removes = [];

   nameCount = 0;
   valueCount = 0;

   dynamoAttributeName;
   dynamoDoc;

   constructor(json) {
      this.dynamoDoc = this.process(json);
      if (this.dynamoDoc.M) {
         this.dynamoAttributeName = Object.keys(this.dynamoDoc.M)[0];
         this.dynamoDoc = Object.values(this.dynamoDoc.M)[0];
      }
   }

   process(node, variablePath) {
      if ((typeof node === 'object') && (node !== null)) {
         const currentDynamoNode = { M: {} };
         const objKeys = Object.keys(node);
         objKeys.forEach((objKey) => {
            const variable = `#n${this.nameCount}`;
            this.nameVariables[variable] = objKey;
            this.nameCount += 1;

            this.currentParent = this.currentParent || { M: {} };
            this.currentParent[objKey] = {};
            this.currentParent = this.currentParent[objKey];

            currentDynamoNode.M[objKey] = this.process(
               node[objKey],
               (variablePath) ? `${variablePath}.${variable}` : variable,
               currentDynamoNode.M
            );
         });
         return currentDynamoNode;
      }

      const valueVariable = `:v${this.valueCount}`;
      this.valueCount += 1;

      if (node === undefined) {
         this.removes.push(variablePath);
         return undefined;
      }

      let nodeValue;
      if (node === null) {
         nodeValue = { NULL: true };
      } else if (typeof node === 'boolean') {
         nodeValue = { BOOL: node };
      } else if (typeof node === 'string') {
         nodeValue = { S: node };
      } else if (!isNaN(node)) {
         nodeValue = { N: node.toString() };
      }

      this.valueVariables[valueVariable] = nodeValue;
      this.sets[variablePath] = valueVariable;
      return nodeValue;
   }

   paramsForCompleteUpdate(tableName, partitionIdString, sortKeyName, sortKey) {
      const params = {
         TableName: tableName,
         Key: {
            partitionId: { N: partitionIdString }
         },
         UpdateExpression: 'SET #n0=:v0',
         ExpressionAttributeNames: { '#n0': this.dynamoAttributeName },
         ExpressionAttributeValues: { ':v0': this.dynamoDoc }
      };
      params.Key[sortKeyName] = { S: sortKey };
      return params;
   }

   get FilterExpression() {
      let expression;

      Object.keys(this.sets).forEach((objKey) => {
         if (expression === undefined) {
            expression = '';
         } else {
            expression += ' AND ';
         }
         expression += `${objKey} = ${this.sets[objKey]}`;
      });

      this.removes.forEach((variable) => {
         if (expression === undefined) {
            expression += '';
         } else {
            expression += ' AND ';
         }
         expression += `${variable} = undefined`;
      });

      return expression;
   }

   get FilterExpressionAttributeValues() {
      const ret = {};
      Object.keys(this.valueVariables).forEach((valueVariable) => {
         Object.keys(this.valueVariables[valueVariable]).forEach((value) => {
            ret[valueVariable] = this.valueVariables[valueVariable][value];
         });
      });
      return ret;
   }

   get UpdateExpression() {
      let expression;

      Object.keys(this.sets).forEach((objKey) => {
         if (expression === undefined) {
            expression = 'SET ';
         } else {
            expression += ', ';
         }
         expression += `${objKey}=${this.sets[objKey]}`;
      });

      this.removes.forEach((variable) => {
         if (expression === undefined) {
            expression += '  REMOVE ';
         } else {
            expression += ', ';
         }
         expression += variable;
      });

      return expression;
   }

   get ExpressionAttributeNames() {
      return this.nameVariables;
   }

   get ExpressionAttributeValues() {
      return this.valueVariables;
   }

   // get ExpressionAttributeValuesAsStrings() {
   //    return this.valueVariablesAsStrings;
   // }
}

function filteredScan(req, tableName, exactMatch) {
   const expressions = new ObjectExpressions(exactMatch);
   const params = {
      TableName: tableName,
      FilterExpression: expressions.FilterExpression,
      ExpressionAttributeNames: expressions.ExpressionAttributeNames,
      ExpressionAttributeValues: expressions.FilterExpressionAttributeValues
   };

   return new Promise((resolve, reject) => {
      docClient().scan(params).promise()
         .then(data => resolve(data.Items))
         .catch(err => reject(err));
   });
}

/**
 * References:
 * http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html
 * http://stackoverflow.com/questions/36698945/scan-function-in-dynamodb-with-reserved-keyword-as-filterexpression-nodejs#36712485
 * http://stackoverflow.com/questions/40283653/how-to-use-in-statement-in-filterexpression-using-array-dynamodb#40301073
 *
 * @param req
 * @param tableName
 * @param attributeName
 * @param values
 * @returns {*}
 */
function filteredScanValueIn(req, tableName, attributeName, values) {
   if ((values === undefined) || (values.length === 0)) {
      return Promise.resolve([]);
   }

   let filterExpression = '';

   // Convert `attributeName` to query expressions.
   const queryNames = {};
   let index = 0;
   let queryName;
   attributeName.split('.').forEach((path) => {
      index += 1;
      queryName = `#n1${index}`;
      queryNames[queryName.toString()] = path;
      filterExpression += (filterExpression.length === 0) ? '' : '.';
      filterExpression += queryName;
   });

   // Convert attribute `values` to query expression.
   const queryValues = {};
   index = 0;
   values.forEach((value) => {
      index += 1;
      const queryKey = `:v1${index}`;
      queryValues[queryKey.toString()] = value;
   });
   filterExpression += ` IN (${Object.keys(queryValues).toString()})`;

   const params = {
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: queryNames,
      ExpressionAttributeValues: queryValues
   };

   return new Promise((resolve, reject) => {
      docClient().scan(params).promise()
         .then((data) => {
            resolve(data.Items);
         })
         .catch(err => reject(err));
   });
}

export function createItem(req, partitionId, tableName, sortKeyName, sortKey, infoName, info) {
   const params = {
      TableName: tableName,
      Item: {
         partitionId
      }
   };
   params.Item[sortKeyName] = sortKey;
   params.Item[infoName] = info;

   return docClient().put(params).promise();
}

/**
 * Requires intermediate paths to already exist.
 *
 * @param req
 * @param partitionId
 * @param tableName
 * @param sortKeyName
 * @param sortKey
 * @param updateInfo
 * @returns {Promise}
 */
export function updateItem(req, partitionId, tableName, sortKeyName, sortKey, updateInfo) {
   const dynamoDb = req.app.locals.db;
   const partitionIdString = ((typeof partitionId === 'string') || (partitionId instanceof String)) ? partitionId : String(partitionId);
   const expressions = new ObjectExpressions(updateInfo);

   const params = {
      TableName: tableName,
      Key: {
         partitionId: { N: partitionIdString },
      },
      UpdateExpression: expressions.UpdateExpression,
      ExpressionAttributeNames: expressions.ExpressionAttributeNames,
      ExpressionAttributeValues: expressions.ExpressionAttributeValues
   };
   params.Key[sortKeyName] = { S: sortKey };

   return new Promise((resolve, reject) => {
      dynamoDb.updateItem(params).promise()
         .then(() => resolve())
         .catch(err => reject(err));
   });
}

export function updateItemCompletely(req, partitionId, tableName, sortKeyName, sortKey, updateInfo) {
   const dynamoDb = req.app.locals.db;
   const partitionIdString = ((typeof partitionId === 'string') || (partitionId instanceof String)) ? partitionId : String(partitionId);
   const expressions = new ObjectExpressions(updateInfo);

   const params = expressions.paramsForCompleteUpdate(tableName, partitionIdString, sortKeyName, sortKey);

   return new Promise((resolve, reject) => {
      dynamoDb.updateItem(params).promise()
         .then(() => resolve())
         .catch(err => reject(err));
   });
}


export function getUsersByIds(req, userIds) {
   if (userIds === undefined) {
      return Promise.reject('userIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}users`;
   return batchGetItemBySortKey(req, tableName, 'userId', userIds);
}

export function getUsersByEmailAddresses(req, emails) {
   if (emails === undefined) {
      return Promise.reject('emails needs to be specified.');
   }

   const tableName = `${config.tablePrefix}users`;
   return filteredScanValueIn(req, tableName, 'userInfo.emailAddress', emails);
}


export function getSubscriberUsersByUserIds(req, userIds) {
   if (userIds === undefined) {
      return Promise.reject('userIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}subscriberUsers`;
   return filteredScanValueIn(req, tableName, 'subscriberUserInfo.userId', userIds);
}

export function getSubscriberUsersByIds(req, subscriberUserIds) {
   if (subscriberUserIds === undefined) {
      return Promise.reject('subscriberUserIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}subscriberUsers`;
   return batchGetItemBySortKey(req, tableName, 'subscriberUserId', subscriberUserIds);
}

export function getSubscriberUsersBySubscriberOrgId(req, subscriberOrgId) {
   if (subscriberOrgId === undefined) {
      return Promise.reject('subscriberOrgId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}subscriberUsers`;
   return filteredScanValueIn(req, tableName, 'subscriberUserInfo.subscriberOrgId', [subscriberOrgId]);
}

export function getSubscriberUsersByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId) {
   if ((userId === undefined) || (subscriberOrgId === undefined)) {
      return Promise.reject('userId and subscriberOrgId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}subscriberUsers`;
   return filteredScan(req, tableName, { subscriberUserInfo: { userId, subscriberOrgId } });
}

export function getSubscriberUsersByUserIdAndSubscriberOrgIdAndRole(req, userId, subscriberOrgId, role) {
   if ((userId === undefined) || (subscriberOrgId === undefined) || (role === undefined)) {
      return Promise.reject('userId, subscriberOrgId, and role needs to be specified.');
   }

   const tableName = `${config.tablePrefix}subscriberUsers`;
   return filteredScan(req, tableName, { subscriberUserInfo: { userId, subscriberOrgId, role } });
}


export function getSubscriberOrgsByIds(req, subscriberOrgIds) {
   if (subscriberOrgIds === undefined) {
      return Promise.reject('subscriberOrgIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}subscriberOrgs`;
   return batchGetItemBySortKey(req, tableName, 'subscriberOrgId', subscriberOrgIds);
}

export function getSubscriberOrgsByName(req, subscriberOrgName) {
   if (subscriberOrgName === undefined) {
      return Promise.reject('subscriberOrgName needs to be specified.');
   }

   const tableName = `${config.tablePrefix}subscriberOrgs`;
   return filteredScanValueIn(req, tableName, 'subscriberOrgInfo.name', [subscriberOrgName]);
}


export function getTeamsByIds(req, teamIds) {
   if (teamIds === undefined) {
      return Promise.reject('teamIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teams`;
   return batchGetItemBySortKey(req, tableName, 'teamId', teamIds);
}

export function getTeamBySubscriberOrgIdAndName(req, subscriberOrgId, name) {
   if ((subscriberOrgId === undefined) || (name === undefined)) {
      return Promise.reject('subscriberOrgId and name needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teams`;
   return filteredScan(req, tableName, { teamInfo: { subscriberOrgId, name } });
}


export function getTeamMembersByTeamIdAndUserIdAndRole(req, teamId, userId, role) {
   if ((teamId === undefined) || (userId === undefined) || (role === undefined)) {
      return Promise.reject('teamId, userId, and role needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamMembers`;
   return filteredScan(req, tableName, { teamMemberInfo: { teamId, userId, role } });
}

export function getTeamMembersByUserIdAndTeamId(req, userId, teamId) {
   if ((userId === undefined) || (teamId === undefined)) {
      return Promise.reject('userId and teamId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamMembers`;
   return filteredScan(req, tableName, { teamMemberInfo: { userId, teamId } });
}

export function getTeamMembersBySubscriberUserIds(req, subscriberUserIds) {
   if (subscriberUserIds === undefined) {
      return Promise.reject('subscriberUserIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamMembers`;
   return filteredScanValueIn(req, tableName, 'teamMemberInfo.subscriberUserId', subscriberUserIds);
}

export function getTeamMembersByTeamId(req, teamId) {
   if (teamId === undefined) {
      return Promise.reject('teamId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamMembers`;
   return filteredScanValueIn(req, tableName, 'teamMemberInfo.teamId', [teamId]);
}

export function getTeamMembersByIds(req, teamMemberIds) {
   if (teamMemberIds === undefined) {
      return Promise.reject('teamMemberIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamMembers`;
   return batchGetItemBySortKey(req, tableName, 'teamMemberId', teamMemberIds);
}

export function getTeamMembersByUserIds(req, userIds) {
   if (userIds === undefined) {
      return Promise.reject('userIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamMembers`;
   return filteredScanValueIn(req, tableName, 'teamMemberInfo.userId', userIds);
}


export function getTeamRoomMembersByTeamRoomId(req, teamRoomId) {
   if (teamRoomId === undefined) {
      return Promise.reject('teamRoomId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamRoomMembers`;
   return filteredScanValueIn(req, tableName, 'teamRoomMemberInfo.teamRoomId', [teamRoomId]);
}

export function getTeamRoomMembersByTeamRoomIdAndUserIdAndRole(req, teamRoomId, userId, role) {
   if ((teamRoomId === undefined) || (userId === undefined) || (role === undefined)) {
      return Promise.reject('teamRoomId, userId, and role needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamRoomMembers`;
   return filteredScan(req, tableName, { teamRoomMemberInfo: { teamRoomId, userId, role } });
}

export function getTeamRoomMembersByTeamMemberIds(req, teamMemberIds) {
   if (teamMemberIds === undefined) {
      return Promise.reject('teamMemberIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamRoomMembers`;
   return filteredScanValueIn(req, tableName, 'teamRoomMemberInfo.teamMemberId', teamMemberIds);
}

export function getTeamRoomMembersByUserIds(req, userIds) {
   if (userIds === undefined) {
      return Promise.reject('userIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamRoomMembers`;
   return filteredScanValueIn(req, tableName, 'teamRoomMemberInfo.userId', userIds);
}


export function getTeamRoomsByIds(req, teamRoomIds) {
   if (teamRoomIds === undefined) {
      return Promise.reject('teamRoomIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamRooms`;
   return batchGetItemBySortKey(req, tableName, 'teamRoomId', teamRoomIds);
}

export function getTeamRoomsByTeamIdAndName(req, teamId, name) {
   if ((teamId === undefined) || (name === undefined)) {
      return Promise.reject('teamId and name needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamRooms`;
   return filteredScan(req, tableName, { teamRoomInfo: { teamId, name } });
}


export function getConversationsByIds(req, conversationIds) {
   if (conversationIds === undefined) {
      return Promise.reject('conversationIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}conversations`;
   return batchGetItemBySortKey(req, tableName, 'conversationId', conversationIds);
}

export function getConversationsByTeamRoomId(req, teamRoomId) {
   if (teamRoomId === undefined) {
      return Promise.reject('teamRoomId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}conversations`;
   return filteredScan(req, tableName, { conversationInfo: { teamRoomId } });
}


export function getMessageById(req, messageId) {
   if (messageId === undefined) {
      return Promise.reject('messageId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}messages`;
   return batchGetItemBySortKey(req, tableName, 'messageId', [messageId]);
}

export function getMessagesByConversationId(req, conversationId) {
   if (conversationId === undefined) {
      return Promise.reject('conversationId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}messages`;
   return filteredScanValueIn(req, tableName, 'messageInfo.conversationId', [conversationId]);
}

function scan(params) {
   return new Promise((resolve, reject) => {
      let items;
      docClient().scan(params).promise()
         .then((data) => {
            items = data.Items;
            if (data.LastEvaluatedKey) {
               const continueParams = _.cloneDeep(params);
               continueParams.ExclusiveStartKey = data.LastEvaluatedKey;
               return scan(continueParams);
            }
            return undefined;
         })
         .then((moreData) => {
            if (moreData) {
               items = [...items, ...moreData.Items];
            }
            resolve(items);
         })
         .catch(err => reject(err));
   });
}

// filter = { since, until, minLevel, maxLevel }
export function getMessagesByConversationIdFiltered(req, conversationId, filter) {
   if (conversationId === undefined) {
      return Promise.reject('conversationId needs to be specified.');
   }

   const { since, until, minLevel, maxLevel } = filter;
   const tableName = `${config.tablePrefix}messages`;
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
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: queryNames,
      ExpressionAttributeValues: queryValues
   };
   return scan(params);
}

export function getConversationParticipantsByUserId(req, userId) {
   if (userId === undefined) {
      return Promise.reject('userId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}conversationParticipants`;
   return filteredScanValueIn(req, tableName, 'conversationParticipantInfo.userId', [userId]);
}

export function getConversationParticipantsByConversationId(req, conversationId) {
   if (conversationId === undefined) {
      return Promise.reject('conversationId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}conversationParticipants`;
   return filteredScanValueIn(req, tableName, 'conversationParticipantInfo.conversationId', [conversationId]);
}
