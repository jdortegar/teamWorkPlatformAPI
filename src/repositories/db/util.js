import _ from 'lodash';

export const scan = (req, params, retrievedItems = []) => {
   return new Promise((resolve, reject) => {
      req.app.locals.docClient.scan(params).promise()
         .then((data) => {
            const items = [...retrievedItems, ...data.Items];
            if (data.LastEvaluatedKey) {
               const continueParams = _.cloneDeep(params);
               continueParams.ExclusiveStartKey = data.LastEvaluatedKey;
               return scan(req, continueParams, items);
            }
            return items;
         })
         .then(items => resolve(items))
         .catch(err => reject(err));
   });
};

export const query = (req, params, retrievedItems = []) => {
   return new Promise((resolve, reject) => {
      req.app.locals.docClient.query(params).promise()
         .then((data) => {
            const items = [...retrievedItems, ...data.Items];
            if (data.LastEvaluatedKey) {
               const continueParams = _.cloneDeep(params);
               continueParams.ExclusiveStartKey = data.LastEvaluatedKey;
               return query(req, continueParams, items);
            }
            return items;
         })
         .then(items => resolve(items))
         .catch(err => reject(err));
   });
};

const batchGetSet = (req, tableName, setsOf100, retrievedItems) => {
   if (setsOf100.length === 0) {
      return Promise.resolve(retrievedItems);
   }

   return new Promise((resolve, reject) => {
      const currentSet = setsOf100.shift();
      const params = {
         RequestItems: {}
      };
      params.RequestItems[tableName] = { Keys: currentSet };
      req.app.locals.docClient.batchGet(params).promise()
         .then((data) => {
            const items = data.Responses[tableName];
            const moreRetrievedItems = [...retrievedItems, ...items];
            return batchGetSet(req, tableName, setsOf100, moreRetrievedItems);
         })
         .then(allRetrievedItems => resolve(allRetrievedItems))
         .catch(err => reject(err));
   });
};

export const batchGet = (req, tableName, hashKeyName, hashKeys) => {
   // Break it up in <= 100 per DynamoDB rules for batchGetItem.
   const setsOf100 = [];
   let currentSet = [];
   hashKeys.forEach((hashKey) => {
      const key = {};
      key[hashKeyName] = hashKey;
      currentSet.push(key);
      if (currentSet.length === 100) {
         setsOf100.push(currentSet);
         currentSet = [];
      }
   });
   setsOf100.push(currentSet);

   return batchGetSet(req, tableName, setsOf100, []);
};
