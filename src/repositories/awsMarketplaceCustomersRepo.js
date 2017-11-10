import config from '../config/env';
import * as util from './util';
import { createUpdateExpression } from './expressionHelper';

// Schema Version for awsMarketplaceCustomers table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const getCustomer = (req, awsCustomerId) => {
   return new Promise((resolve, reject) => {
      const tableName = `${config.tablePrefix}awsMarketplaceCustomers`;
      const params = {
         TableName: tableName,
         Key: {
            awsCustomerId
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

export const getAllCustomers = (req) => {
   return new Promise((resolve, reject) => {
      const tableName = `${config.tablePrefix}awsMarketplaceCustomers`;
      const params = {
         TableName: tableName
      };

      util.scan(params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const createCustomer = (req, subscriberOrgId, awsCustomerId, awsProductCode, entitlements, expiration, maxUsers, currentUsers, maxGB, currentGB) => {
   const tableName = `${config.tablePrefix}awsMarketplaceCustomers`;
   const params = {
      TableName: tableName,
      Item: {
         awsCustomerId,
         v,
         subscriberOrgId,
         awsProductCode,
         entitlements,
         expiration,
         maxUsers,
         currentUsers,
         maxGB,
         currentGB,
         created: req.now.format(),
         lastModified: req.now.format()
      }
   };

   return req.app.locals.docClient.put(params).promise();
};

export const updateCustomer = (req, awsCustomerId, updateInfo) => {
   const tableName = `${config.tablePrefix}awsMarketplaceCustomers`;
   const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = createUpdateExpression(updateInfo);
   const params = {
      TableName: tableName,
      Key: { awsCustomerId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues
   };

   return req.app.locals.docClient.update(params).promise();
};
