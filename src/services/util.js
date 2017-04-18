import AWS from 'aws-sdk';
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
         console.log(`objKey=${objKey}, value=${value}, ret[objKey]=${ret[objKey]}`);
         return ret;
   }
}

function removeIntermediateDataTypeFromArray(arr) {
   const ret = [];
   arr.forEach(item => ret.push(removeIntermediateDataType(item)));
   return ret;
}


function batchGetItemBySortKey(req, tableName, sortKeyName, sortKeys) {
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

function filteredScan(req, tableName, attributeName, values) {
   const queryObject = {};
   let filterExpression = '';
   let index = 0;
   values.forEach((value) => {
      index += 1;
      const queryKey = `:v1${index}`;
      queryObject[queryKey.toString()] = value;
   });
   filterExpression += `${attributeName} IN (${Object.keys(queryObject).toString()})`;
   const params = {
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: queryObject,
      Limit: 50
   };
   // TODO: this query sucks.  http://stackoverflow.com/questions/40283653/how-to-use-in-statement-in-filterexpression-using-array-dynamodb#40301073

   return new Promise((resolve, reject) => {
      docClient().scan(params).promise()
         .then(data => resolve(data.Items))
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


export function getSubscriberUsersByUserIds(req, userIds) {
   if (userIds === undefined) {
      return Promise.reject('userIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}subscriberUsers`;
   return filteredScan(req, tableName, 'subscriberUserInfo.userId', userIds);
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

   const filterExpression = 'subscriberUserInfo.subscriberOrgId = :subscriberOrgId';
   const params = {
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: {
         ':subscriberOrgId': subscriberOrgId
      },
      Limit: 50
   };

   return new Promise((resolve, reject) => {
      docClient().scan(params).promise()
         .then(data => resolve(data.Items))
         .catch(err => reject(err));
   });
}


export function getSubscriberOrgsByIds(req, subscriberOrgIds) {
   if (subscriberOrgIds === undefined) {
      return Promise.reject('subscriberOrgIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}subscriberOrgs`;
   return batchGetItemBySortKey(req, tableName, 'subscriberOrgId', subscriberOrgIds);
}


export function getTeamMembersBySubscriberUserIds(req, subscriberUserIds) {
   if (subscriberUserIds === undefined) {
      return Promise.reject('subscriberUserIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamMembers`;
   return filteredScan(req, tableName, 'teamMemberInfo.subscriberUserId', subscriberUserIds);
}

export function getTeamMembersByIds(req, teamMemberIds) {
   if (teamMemberIds === undefined) {
      return Promise.reject('teamMemberIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamMembers`;
   return batchGetItemBySortKey(req, tableName, 'teamMemberId', teamMemberIds);
}

export function getTeamMembersByTeamId(req, teamId) {
   if (teamId === undefined) {
      return Promise.reject('teamId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamMembers`;

   const filterExpression = 'teamMemberInfo.teamId = :teamId';
   const params = {
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: {
         ':teamId': teamId
      },
      Limit: 50
   };

   return new Promise((resolve, reject) => {
      docClient().scan(params).promise()
         .then(data => resolve(data.Items))
         .catch(err => reject(err));
   });
}


export function getTeamsByIds(req, teamIds) {
   if (teamIds === undefined) {
      return Promise.reject('teamIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teams`;
   return batchGetItemBySortKey(req, tableName, 'teamId', teamIds);
}


export function getTeamRoomMembersByTeamRoomId(req, teamRoomId) {
   if (teamRoomId === undefined) {
      return Promise.reject('teamRoomId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamRoomMembers`;
   return filteredScan(req, tableName, 'teamRoomMemberInfo.teamRoomId', [teamRoomId]);
}

export function getTeamRoomMembersByTeamMemberIds(req, teamMemberIds) {
   if (teamMemberIds === undefined) {
      return Promise.reject('teamMemberIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamRoomMembers`;
   return filteredScan(req, tableName, 'teamRoomMemberInfo.teamMemberId', teamMemberIds);
}


export function getTeamRoomsByIds(req, teamRoomIds) {
   if (teamRoomIds === undefined) {
      return Promise.reject('teamRoomIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamRooms`;
   return batchGetItemBySortKey(req, tableName, 'teamRoomId', teamRoomIds);
}


export function getConversationsByIds(req, conversationIds) {
   if (conversationIds === undefined) {
      return Promise.reject('conversationIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}conversations`;
   return batchGetItemBySortKey(req, tableName, 'conversationId', conversationIds);
}


export function getMessagesByConversationId(req, conversationId) {
   if (conversationId === undefined) {
      return Promise.reject('conversationId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}messages`;
   return filteredScan(req, tableName, 'messageInfo.conversationId', [conversationId]);
}

export function getConversationParticipantsByUserId(req, userId) {
   if (userId === undefined) {
      return Promise.reject('userId needs to be specified.');
   }

   const tableName = `${config.tablePrefix}conversationParticipants`;
   return filteredScan(req, tableName, 'conversationParticipantInfo.userId', [userId]);
}
