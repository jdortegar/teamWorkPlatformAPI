import AWS from 'aws-sdk';
import _ from 'lodash';
import config from '../config/env';

let _docClient;

export function docClient() {
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


export function batchGetItemBySortKey(req, tableName, sortKeyName, sortKeys) {
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
      if ((node instanceof Array) && (node !== null)) {
         const currentDynamoNode = { L: [] };
         node.forEach((nodeElem) => {
            const variable = `#n${this.nameCount}`;
            this.nameCount += 1;

            currentDynamoNode.L.push(this.process(
               nodeElem,
               (variablePath) ? `${variablePath}.${variable}` : variable
            ));
         });
         return currentDynamoNode;
      } else if ((typeof node === 'object') && (node !== null)) {
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

   paramsForCompleteUpdate(tableName, partitionIdString, sortKeyName, sortKey, v) {
      const params = {
         TableName: tableName,
         Key: {
            partitionId: { N: partitionIdString }
         },
         UpdateExpression: 'SET #n0=:v0',
         ExpressionAttributeNames: { '#n0': this.dynamoAttributeName },
         ExpressionAttributeValues: { ':v0': this.dynamoDoc }
      };
      if (v) {
         params.UpdateExpression = `${params.UpdateExpression}, v=:v1`;
         params.ExpressionAttributeValues[':v1'] = { N: v.toString() };
      }

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

export function updateItemCompletely(req, partitionId, tableName, sortKeyName, sortKey, updateInfo, v) {
   const dynamoDb = req.app.locals.db;
   const partitionIdString = ((typeof partitionId === 'string') || (partitionId instanceof String)) ? partitionId : String(partitionId);
   const expressions = new ObjectExpressions(updateInfo);

   const params = expressions.paramsForCompleteUpdate(tableName, partitionIdString, sortKeyName, sortKey, v);

   return new Promise((resolve, reject) => {
      dynamoDb.updateItem(params).promise()
         .then(() => resolve())
         .catch(err => reject(err));
   });
}

export function scan(params) {
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

export function getTeamRoomsByTeamId(req, teamId) {
   if (teamId === undefined) {
      return Promise.reject('teamId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamRooms`;
   return filteredScan(req, tableName, { teamRoomInfo: { teamId } });
}

export function getTeamRoomsByTeamIdAndPrimary(req, teamId, primary) {
   if ((teamId === undefined) || (primary === undefined)) {
      return Promise.reject('teamId and primary needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamRooms`;
   return filteredScan(req, tableName, { teamRoomInfo: { teamId, primary } });
}

