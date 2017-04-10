import httpStatus from 'http-status';
import uuid from 'uuid';
import config from '../config/env';
import { hashPassword } from '../models/user';

function addUserToCache(req, email, uid, status) {
   return new Promise((resolve, reject) => {
      console.log(`users-create: user ${email} not in cache`);
      console.log(`users-create: new uuid: ${uid}`);
      req.app.locals.redis.hmsetAsync(email, 'uid', uid, 'status', status)
         .then((addUserToCacheResponse) => {
            console.log(`users-create: created redis hash for email: ${email}`);
            resolve(addUserToCacheResponse);
         })
         .catch((err) => {
            console.log('users-create: hmset status - redis error');
            reject(err);
         });
   });
}

function addUserToDb(req, partitionId, uid, requestBody) {
   const docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
   const tableName = `${config.tablePrefix}users`;

   const { email, firstName, lastName, displayName, password, country, timeZone } = requestBody;
   let { icon } = requestBody;
   icon = icon || null;
   const params = {
      TableName: tableName,
      Item: {
         partitionId,
         userId: uid,
         userInfo: {
            emailAddress: email,
            firstName,
            lastName,
            displayName,
            password: hashPassword(password),
            country,
            timeZone,
            icon
            // ,iconType
         }
      }
   };
   // TODO: for update.
   // userInfo: {
   //    emailAddress: email,
   //       firstName,
   //       lastName,
   //       displayName,
   //       country,
   //       timeZone,
   //       icon,
   //       iconType,
   //       address1,
   //       address2,
   //       zip_postalcode,
   //       city_province
   // }

   console.log('Adding a new item...');
   return docClient.put(params).promise();
}

function addSubscriberOrgToDb(req, partitionId, uid, name) {
   const docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
   const tableName = `${config.tablePrefix}subscriberOrgs`;

   const params = {
      TableName: tableName,
      Item: {
         partitionId,
         subscriberOrgId: uid,
         subscriberOrgInfo: {
            name
         }
      }
   };

   return docClient.put(params).promise();
}

function addSubscriberUserToDb(req, partitionId, uid, userId, subscriberOrgId) {
   const docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
   const tableName = `${config.tablePrefix}subscriberUsers`;

   const params = {
      TableName: tableName,
      Item: {
         partitionId,
         subscriberUserId: uid,
         subscriberUserInfo: {
            userId,
            subscriberOrgId
         }
      }
   };

   return docClient.put(params).promise();
}


class UserService {
   addUser(req, userInfo) {
      return new Promise((resolve, reject) => {
         const { email } = userInfo;

         let uid;

         // First, use email addr to see if it's already in redis.
         req.app.locals.redis.hgetAsync(email, 'uid')
            .then((retrievedUid) => {
               uid = retrievedUid;

               // If key is found in cache, reply with user already registered.
               console.log(`users-create: user ${email} found in cache`);
               console.log(`uid: ${uid}`);

               return req.app.locals.redis.hgetAsync(email, 'status');
            })
            .then((userStatus) => {
               console.log(`status: ${userStatus}`);
               if ((userStatus === undefined) || (userStatus == null)) {
                  // Otherwise, add user to cache add user table.
                  uid = uuid.v4();
                  const status = 1;
                  const subscriberOrgId = uuid.v4();
                  const subscriberOrgName = req.body.displayName;
                  const subscriberUserId = uuid.v4();

                  return Promise.all([
                     addUserToCache(req, email, uid, status),
                     addUserToDb(req, -1, uid, req.body),
                     addSubscriberOrgToDb(req, -1, subscriberOrgId, subscriberOrgName),
                     addSubscriberUserToDb(req, -1, subscriberUserId, uid, subscriberOrgId)
                  ]);
                  // TODO: Do we need to send them a second email?
                  // mailer.sendActivationLink(email, uid).then(() => {
                  //
                  //   const response = {
                  //     status: 'SUCCESS',
                  //     uuid: uid
                  //   };
                  //   res.json(response);
                  //   res.status(httpStatus.OK).json();
                  //
                  // });
               }
               else {
                  return undefined;
               }
            })
            .then((cacheAndDbStatuses) => {
               if (cacheAndDbStatuses) {
                  resolve({ httpStatus: httpStatus.CREATED });
               } else {
                  resolve({ httpStatus: httpStatus.FORBIDDEN });

                  // resolve({
                  //    httpStatus: httpStatus.FORBIDDEN,
                  //    body: {
                  //       status: 'ERR_USER_ALREADY_REGISTERED',
                  //       uid: uid,
                  //       userStatus: userStatus
                  //    }
                  // });
               }
            })
            .catch((err) => {
               reject(err);
            });
      });
   }
}

const userService = new UserService();
export default userService;
