import config from '../../config/env';
import moment from 'moment';
import * as util from './util';

const tableName = () => {
   return `${config.tablePrefix}requests`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};


export const createRequest = (req, requestId, teamId, teamAdminId,  userId) => {

  const created = req.now.format()
  const defaultExpirationMinutes = 7 * 24 * 60;
  const expired = moment(created).add(defaultExpirationMinutes, 'minutes').format();

   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            requestId,
            created,
            v,
            teamId,
            teamAdminId,
            userId,
            expired,
            accepted: 'pending',
            lastModified: req.now.format()
         }
      };

      req.app.locals.docClient
         .put(params)
         .promise()
         .then(result => resolve(result.$response.request.rawParams.Item))
         .catch(err => reject(err));
   });
};

export const getRequestByTeamIdAndUserId = (req, teamId, userId) =>{
  return new Promise((resolve, reject)=>{
    const params = {
      TableName: tableName(),
      IndexName: 'teamIdx',
      KeyConditionExpression: 'teamId = :teamId',
      FilterExpression: '#userId = :userId',
      ExpressionAttributeNames: {
        '#userId': 'userId'
      },
      ExpressionAttributeValues: {
        ':teamId': teamId,
        ':userId': userId
      }
    }
    util.query(req, params)
      .then(originalResults => upgradeSchema(req, originalResults))
      .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
      .catch(err => reject(err))
  })
}

 export const getRequestsByUserIdAndPendingAccepted = (req, teamAdminId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         FilterExpression: 'teamAdminId = :teamAdminId and accepted = :accepted',
         ExpressionAttributeValues: {
            ':teamAdminId': teamAdminId,
            ':accepted': 'pending'
         }
      };

      util.scan(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};


export const updateRequest = async (req, requestId, accepted) => {
   const lastModified = req.now.format();
   const params = {
      TableName: tableName(),
      Key: { requestId },
      UpdateExpression: 'set accepted = :accepted, lastModified = :lastModified',
      ExpressionAttributeValues: {
         ':lastModified': lastModified,
         ':accepted': accepted
      }
   };
   await req.app.locals.docClient.update(params).promise();
   return { requestId, accepted };
};
