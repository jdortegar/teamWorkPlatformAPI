import uuid from 'uuid';
import config from '../config/env';
import { subscriberOrgCreated, subscriberOrgUpdated } from './messaging';
import { NoPermissionsError } from './teamService';
import {
   getSubscriberOrgsByIds,
   getSubscriberOrgsByName,
   getSubscriberUsersBySubscriberOrgId,
   getSubscriberUsersByUserIds,
   getUsersByIds
} from './util';

export class SubscriberOrgNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, SubscriberOrgNotExistError);
   }
}

export class SubscriberOrgExistsError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, SubscriberOrgExistsError);
   }
}


function createSubscriberOrgInDb(req, partitionId, subscriberOrgId, subscriberOrg) {
   const docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
   const tableName = `${config.tablePrefix}subscriberOrgs`;

   const params = {
      TableName: tableName,
      Item: {
         partitionId,
         subscriberOrgId,
         subscriberOrgInfo: subscriberOrg
      }
   };

   return docClient.put(params).promise();
}


class SubscriberOrgService {

   getUserSubscriberOrgs(req, userId) {
      return new Promise((resolve, reject) => {
         getSubscriberUsersByUserIds(req, [userId])
            .then((subscriberUsers) => {
               const subscriberOrgIds = subscriberUsers.map(subscriberUser => subscriberUser.subscriberUserInfo.subscriberOrgId);
               return getSubscriberOrgsByIds(req, subscriberOrgIds);
            })
            .then((subscriberOrgs) => {
               // Remove partitionId.
               const retSubscriberOrgs = [];
               subscriberOrgs.forEach((subscriberOrg) => {
                  const subscriberOrgClone = JSON.parse(JSON.stringify(subscriberOrg));
                  delete subscriberOrgClone.partitionId;
                  retSubscriberOrgs.push(subscriberOrgClone);
               });
               resolve(retSubscriberOrgs);
            })
            .catch(err => reject(err));
      });
   }

   createSubscriberOrg(req, subscriberOrgName, { subscriberOrgId, userId }) {
      return new Promise((resolve, reject) => {
         // TODO: if (userId), check canCreateSubscriberOrg() -> false, reject 403 forbidden
         const actualSubscriberOrgId = subscriberOrgId || uuid.v4();
         const subscriberOrg = { name: subscriberOrgName };
         getSubscriberOrgsByName(req, subscriberOrgName)
            .then((existingSubscriberOrgs) => {
               if (existingSubscriberOrgs.length > 0) {
                  throw new SubscriberOrgExistsError(subscriberOrgName);
               } else {
                  return createSubscriberOrgInDb(req, -1, actualSubscriberOrgId, subscriberOrg);
               }
            })
            .then(() => {
               subscriberOrg.subscriberOrgId = actualSubscriberOrgId;
               resolve(subscriberOrg);
               subscriberOrgCreated(req, subscriberOrg);
            })
            .catch(err => reject(err));
      });
   }

   /**
    * Create a subscriber organization given the name+`appendNumber`.
    * if the name exists, append ' (n)', where n >= 1 to avoid conflict.
    *
    * @param req
    * @param subscriberOrgName
    * @param appendNumber (optional)
    */
   createSubscriberOrgUsingBaseName(req, subscriberOrgId, subscriberOrgName, appendNumber = undefined) {
      const tryName = subscriberOrgName + ((appendNumber) ? ` (${appendNumber})` : '');
      return new Promise((resolve, reject) => {
         this.createSubscriberOrg(req, tryName, { subscriberOrgId })
            .then(createdSubscriberOrg => resolve(createdSubscriberOrg))
            .catch((err) => {
               if (err instanceof SubscriberOrgExistsError) {
                  const tryNumber = (appendNumber) ? appendNumber + 1 : 1;
                  this.createSubscriberOrgUsingBaseName(req, subscriberOrgId, subscriberOrgName, tryNumber)
                     .then(createdSubscriberOrg => resolve(createdSubscriberOrg))
                     .catch(err2 => reject(err2));
               } else {
                  reject(err);
               }
            });
      });
   }

   /**
    * If the subscriber org doesn't exist, a SubscriberOrgNotExistError is thrown.
    *
    * If userId is specified, an additional check is applied to confirm the user is actually a subscriber of the subscriber org.
    * If userId is specified and the user is not a subscriber of the subscriber org, a NoPermissionsError is thrown.
    *
    * @param req
    * @param subscriberOrgId
    * @param userId Optional userId to return results only if the user is a subscriber.
    * @returns {Promise}
    */
   getSubscriberOrgUsers(req, subscriberOrgId, userId = undefined) {
      return new Promise((resolve, reject) => {
         getSubscriberOrgsByIds(req, [subscriberOrgId])
            .then((subscriberOrgs) => {
               if (subscriberOrgs.length === 0) {
                  throw new SubscriberOrgNotExistError(subscriberOrgId);
               }
               return getSubscriberUsersBySubscriberOrgId(req, subscriberOrgId);
            })
            .then((subscriberUsers) => {
               if (subscriberUsers.length === 0) {
                  throw new NoPermissionsError(subscriberOrgId);
               }

               const userIds = subscriberUsers.map(subscriberUser => subscriberUser.subscriberUserInfo.userId);
               if ((userId) && (userIds.indexOf(userId)) < 0) {
                  throw new NoPermissionsError(subscriberOrgId);
               }

               return getUsersByIds(req, userIds);
            })
            .then(users => resolve(users))
            .catch(err => reject(err));
      });
   }
}

const subscriberOrgService = new SubscriberOrgService();
export default subscriberOrgService;
