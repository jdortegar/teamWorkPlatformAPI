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
