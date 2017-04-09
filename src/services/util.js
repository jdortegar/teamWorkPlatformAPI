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


export function getUsersByIds(req, userIds) {
   if (userIds === undefined) {
      return Promise.reject('userIds needs to be specified.');
   }

   const dynamoDb = req.app.locals.db;
   const tableName = `${config.tablePrefix}users`;

   const requestItemKeys = userIds.map((userId) => {
      return { partitionId: { N: '-1' }, userId: { S: userId } };
   });
   const params = { RequestItems: {} };
   params.RequestItems[tableName] = { Keys: requestItemKeys };

   return new Promise((resolve, reject) => {
      dynamoDb.batchGetItem(params).promise()
         .then((data) => {
            const returnUsers = removeIntermediateDataTypeFromArray(data.Responses[tableName]);
            resolve(returnUsers);
         })
         .catch((err) => {
            reject(err);
         });
   });
}

export function getSubscriberUsersByUserIds(req, userIds) {
   if (userIds === undefined) {
      return Promise.reject('userIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}subscriberUsers`;

   const queryObject = {};
   let filterExpression = '';
   let index = 0;
   userIds.forEach((value) => {
      index += 1;
      const queryKey = `:uid${index}`;
      queryObject[queryKey.toString()] = value;
   });
   filterExpression += `subscriberUserInfo.userId IN (${Object.keys(queryObject).toString()})`;
   const params = {
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: queryObject,
      Limit: 50
   };

   return new Promise((resolve, reject) => {
      docClient().scan(params).promise()
         .then(data => resolve(data.Items))
         .catch(err => reject(err));
   });
}

export function getSubscriberUsersByIds(req, subscriberUserIds) {
   if (subscriberUserIds === undefined) {
      return Promise.reject('subscriberUserIds needs to be specified.');
   }

   const dynamoDb = req.app.locals.db;
   const tableName = `${config.tablePrefix}subscriberUsers`;

   const requestItemKeys = subscriberUserIds.map((subscriberUserId) => {
      return { partitionId: { N: '-1' }, subscriberUserId: { S: subscriberUserId } };
   });
   const params = { RequestItems: {} };
   params.RequestItems[tableName] = { Keys: requestItemKeys };

   return new Promise((resolve, reject) => {
      dynamoDb.batchGetItem(params).promise()
         .then((data) => {
            const returnTeams = removeIntermediateDataTypeFromArray(data.Responses[tableName]);
            resolve(returnTeams);
         })
         .catch((err) => {
            reject(err);
         });
   });
}

export function getTeamMembersBySubscriberUserIds(req, subscriberUserIds) {
   if (subscriberUserIds === undefined) {
      return Promise.reject('subscriberUserIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamMembers`;

   const queryObject = {};
   let filterExpression = '';
   let index = 0;
   subscriberUserIds.forEach((value) => {
      index += 1;
      const queryKey = `:suid${index}`;
      queryObject[queryKey.toString()] = value;
   });
   filterExpression += `teamMemberInfo.subscriberUserId IN (${Object.keys(queryObject).toString()})`;
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

   const dynamoDb = req.app.locals.db;
   const tableName = `${config.tablePrefix}teams`;

   const requestItemKeys = teamIds.map((teamId) => {
      return { partitionId: { N: '-1' }, teamId: { S: teamId } };
   });
   const params = { RequestItems: {} };
   params.RequestItems[tableName] = { Keys: requestItemKeys };

   return new Promise((resolve, reject) => {
      dynamoDb.batchGetItem(params).promise()
         .then((data) => {
            const returnTeams = removeIntermediateDataTypeFromArray(data.Responses[tableName]);
            resolve(returnTeams);
         })
         .catch((err) => {
            reject(err);
         });
   });
}

export function getTeamRoomMembersByTeamMemberIds(req, teamMemberIds = undefined) {
   if (teamMemberIds === undefined) {
      return Promise.reject('teamMemberIds needs to be specified.');
   }

   const tableName = `${config.tablePrefix}teamRoomMembers`;

   const queryObject = {};
   let filterExpression = '';
   let index = 0;
   teamMemberIds.forEach((value) => {
      index += 1;
      const queryKey = `:tmid${index}`;
      queryObject[queryKey.toString()] = value;
   });
   filterExpression += `teamRoomMemberInfo.teamMemberId IN (${Object.keys(queryObject).toString()})`;
   const params = {
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: queryObject,
      Limit: 50
   };

   return new Promise((resolve, reject) => {
      docClient().scan(params).promise()
         .then(data => resolve(data.Items))
         .catch(err => reject(err));
   });
}

export function getTeamRoomsByIds(req, teamRoomIds) {
   if (teamRoomIds === undefined) {
      return Promise.reject('teamRoomIds needs to be specified.');
   }

   const dynamoDb = req.app.locals.db;
   const tableName = `${config.tablePrefix}teamRooms`;

   const requestItemKeys = teamRoomIds.map((teamRoomId) => {
      return { partitionId: { N: '-1' }, teamRoomId: { S: teamRoomId } };
   });
   const params = { RequestItems: {} };
   params.RequestItems[tableName] = { Keys: requestItemKeys };

   return new Promise((resolve, reject) => {
      dynamoDb.batchGetItem(params).promise()
         .then((data) => {
            const returnTeams = removeIntermediateDataTypeFromArray(data.Responses[tableName]);
            resolve(returnTeams);
         })
         .catch((err) => {
            reject(err);
         });
   });
}
