const expressionNamePrefix = '#n';
const expressionValuePrefix = ':v';

export const createUpdateExpression = (updateObject) => { // eslint-disable-line import/prefer-default-export
   let UpdateExpression;
   const ExpressionAttributeNames = {};
   const ExpressionAttributeValues = {};
   let i = 0;

   Object.keys(updateObject).forEach((key) => {
      const expressionName = `${expressionNamePrefix}${i}`;
      const expressionValue = `${expressionValuePrefix}${i}`;
      const value = updateObject[key];
      if (UpdateExpression) {
         UpdateExpression += ', ';
      } else {
         UpdateExpression = 'set ';
      }
      UpdateExpression += `${expressionName} = ${expressionValue}`;
      ExpressionAttributeNames[expressionName] = key;
      ExpressionAttributeValues[expressionValue] = value;

      i += 1;
   });

   return { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues };
};
