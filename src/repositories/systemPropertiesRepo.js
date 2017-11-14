import config from '../config/env';
import * as util from './util';
import { createUpdateExpression } from './expressionHelper';

const tableName = () => {
   return `${config.tablePrefix}systemProperties`;
};

// Schema Version for systemProperties table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const getSystemProperty = (req, propertyName) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Key: {
            propertyName
         }
      };
      req.app.locals.docClient.get(params).promise()
         .then(data => data.Item)
         .then((originalResult) => {
            if (originalResult) {
               return upgradeSchema(req, [originalResult]);
            }
            return undefined;
         })
         .then((latestResults) => {
            if (latestResults) {
               resolve((latestResults.length > 0) ? latestResults[0] : undefined);
            } else {
               resolve();
            }
         })
         .catch(err => reject(err));
   });
};

export const getAllSystemProperties = (req) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName()
      };

      util.scan(params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const createSystemProperty = (req, propertyName, propertyValue) => {
   const params = {
      TableName: tableName(),
      Item: {
         propertyName,
         v,
         propertyValue
      }
   };

   return req.app.locals.docClient.put(params).promise();
};

export const updateSystemProperty = (req, propertyName, updateInfo) => {
   const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = createUpdateExpression(updateInfo);
   const params = {
      TableName: tableName(),
      Key: { propertyName },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues
   };

   return req.app.locals.docClient.update(params).promise();
};
