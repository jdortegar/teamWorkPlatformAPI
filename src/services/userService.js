import httpStatus from 'http-status';
import uuid from 'uuid';
import config from '../config/env';
import { hashPassword } from '../models/user';
// import { mailer } from '../helpers/mailer';

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

function addTeamToDb(req, partitionId, uid, subscriberOrgId, name) {
   const docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
   const tableName = `${config.tablePrefix}teams`;

   const params = {
      TableName: tableName,
      Item: {
         partitionId,
         teamId: uid,
         teamInfo: {
            subscriberOrgId,
            name
         }
      }
   };

   return docClient.put(params).promise();
}

function addTeamMemberToDb(req, partitionId, uid, subscriberUserId, teamId) {
   const docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
   const tableName = `${config.tablePrefix}teamMembers`;

   const params = {
      TableName: tableName,
      Item: {
         partitionId,
         teamMemberId: uid,
         teamMemberInfo: {
            subscriberUserId,
            teamId
         }
      }
   };

   return docClient.put(params).promise();
}

function addTeamRoomToDb(req, partitionId, uid, teamId, name, purpose, publish, active) {
   const docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
   const tableName = `${config.tablePrefix}teamRooms`;

   const params = {
      TableName: tableName,
      Item: {
         partitionId,
         teamRoomId: uid,
         teamRoomInfo: {
            teamId,
            name,
            purpose,
            publish,
            active
         }
      }
   };

   return docClient.put(params).promise();
}

function addTeamRoomMemberToDb(req, partitionId, uid, teamMemberId, teamRoomId) {
   const docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
   const tableName = `${config.tablePrefix}teamRoomMembers`;

   const params = {
      TableName: tableName,
      Item: {
         partitionId,
         teamRoomMemberId: uid,
         teamRoomMemberInfo: {
            teamMemberId,
            teamRoomId
         }
      }
   };

   return docClient.put(params).promise();
}


class UserService {
   addUser(req, userInfo) {
      return new Promise((resolve, reject) => {
         const { email } = userInfo;

         // First, use email addr to see if it's already in redis.
         req.app.locals.redis.hgetallAsync(email)
            .then((cachedEmail) => {
               if (cachedEmail === null) {
                  // Otherwise, add user to cache add user table.
                  const uid = uuid.v4();
                  const status = 1;
                  const subscriberOrgId = uuid.v4();
                  const subscriberOrgName = req.body.displayName;
                  const subscriberUserId = uuid.v4();
                  const teamId = uuid.v4();
                  const teamName = req.body.displayName;
                  const teamMemberId = uuid.v4();
                  const teamRoomId = uuid.v4();
                  const teamRoomName = req.body.displayName;
                  const teamRoomPurpose = 'My intitial room.';
                  const teamRoomPublish = true;
                  const teamRoomActive = true;
                  const TeamRoomMemberId = uuid.v4();

                  return Promise.all([
                     addUserToCache(req, email, uid, status),
                     addUserToDb(req, -1, uid, req.body),
                     addSubscriberOrgToDb(req, -1, subscriberOrgId, subscriberOrgName),
                     addSubscriberUserToDb(req, -1, subscriberUserId, uid, subscriberOrgId),
                     addTeamToDb(req, -1, teamId, subscriberOrgId, teamName),
                     addTeamMemberToDb(req, -1, teamMemberId, subscriberUserId, teamId),
                     addTeamRoomToDb(req, -1, teamRoomId, teamId, teamRoomName, teamRoomPurpose, teamRoomPublish, teamRoomActive),
                     addTeamRoomMemberToDb(req, -1, TeamRoomMemberId, teamMemberId, teamRoomId)
                  ]);
               }
               return undefined;
            })
            .then((cacheAndDbStatuses) => {
               if (cacheAndDbStatuses) {
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
                  // }); // Needs to be a promise.

                  resolve({ httpStatus: httpStatus.CREATED });
               } else {
                  // Key is found in cache, user already registered.
                  console.log(`users-create: user ${email} found in cache`);
                  resolve({ httpStatus: httpStatus.FORBIDDEN });
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
