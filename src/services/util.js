import AWS from 'aws-sdk';
import { tablePrefix } from '../config/env';

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
      for (const objKey of objKeys) {
         ret[objKey] = removeIntermediateDataType(obj[objKey]);
      }
      return ret;
   } else {
      const objKey = objKeys[0];
      const value = obj[objKey];
      switch (objKey) {
         case 'N':
            return Number(value);
         case 'M':
            ret = {};
            for (const subKey of Object.keys(value)) {
               ret[subKey] = removeIntermediateDataType(value[subKey]);
            }
            return ret;
         case 'S':
            return value;
         case 'BOOL':
            return Boolean(value);
         default:
            ret = {};
            ret[objKey] = removeIntermediateDataType(value);
            console.log(`objKey=${objKey}, value=${value}, ret[objKey]=${ret[objKey]}`);
            return ret;
      }
   }
}

function removeIntermediateDataTypeFromArray(arr) {
   const ret = [];
   for (const item of arr) {
      ret.push(removeIntermediateDataType(item));
   }
   return ret;
}

export function getSubscriberUsers(req, userId = undefined, subscriberOrgId = undefined) {
   if ((userId === undefined) && (subscriberOrgId === undefined)) {
      return Promise.reject('At least one of userId, subscriberOrgId needs to be specified.');
   }

   const tableName = 'DEV_subscriberUsers'; // TODO:

   let filterExpression = (userId) ? 'subscriberUserInfo.userId = :userId' : undefined;
   if (subscriberOrgId) {
      if (filterEpression) {
         filterExpresion += ' and ';
      }
      filterExpression += 'subscriberUserInfo.subscriberOrgId = :subscriberOrgId';
   }
   const params = {
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: {
         ':userId': userId,
         ':subscriberOrgId': subscriberOrgId
      },
      Limit: 50
   };

   return new Promise((resolve, reject) => {
      docClient().scan(params).promise()
         .then((data) => resolve(data.Items))
         .catch((err) => reject(err));
   });
}

export function getTeamMembers(req, subscriberUserIds = undefined, teamIds = undefined) {
   if ((subscriberUserIds === undefined) && (teamIds === undefined)) {
      return Promise.reject('At least one of subscriberUserIds, teamIds needs to be specified.');
   }

   const tableName = 'DEV_teamMembers'; // TODO:

   let filterExpression = '';
   const queryObject = {};
   if (subscriberUserIds) {
      var index = 0;
      subscriberUserIds.forEach((value) => {
         index++;
         const queryKey = `:titlevalue${index}`;
         queryObject[queryKey.toString()] = value;
      });
      filterExpression += `teamMemberInfo.subscriberUserId IN (${Object.keys(queryObject).toString()})`;
   }
   // if (teamIds) {
   //    if (filterEpression) {
   //       filterExpresion += ' and ';
   //    }
   //    filterExpression += 'teamMemberInfo.teamId in (:teamIds)';
   // }
   const params = {
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: queryObject,
      Limit: 50
   };
   // TODO: this query sucks.  http://stackoverflow.com/questions/40283653/how-to-use-in-statement-in-filterexpression-using-array-dynamodb#40301073

   return new Promise((resolve, reject) => {
      docClient().scan(params).promise()
         .then((data) => resolve(data.Items))
         .catch((err) => reject(err));
   });
}

export function getTeamsByIds(req, teamIds) {
   if (teamIds === undefined) {
      return Promise.reject('teamIds needs to be specified.');
   }

   const dynamoDb = req.app.locals.db;
   const tableName = 'DEV_teams'; // TODO:

   const requestItemKeys = teamIds.map((teamId) => {
      return { partitionId: { N: '-1' }, teamId: { S: teamId} };
   });
   const params =  { RequestItems: {} };
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
