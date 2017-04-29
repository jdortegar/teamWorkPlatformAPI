import uuid from 'uuid';
import config from '../config/env';
import { NoPermissionsError, UserNotExistError } from './errors';
import { userCreated, userUpdated } from './messaging';
import subscriberOrgSvc from './subscriberOrgService';
import { getUsersByIds } from './queries';
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

function createUserInDb(req, partitionId, userId, user) {
   const docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
   const tableName = `${config.tablePrefix}users`;

   const params = {
      TableName: tableName,
      Item: {
         partitionId,
         userId,
         userInfo: user
      }
   };

   console.log('Adding a new item...');
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
   createUser(req, userInfo) {
      return new Promise((resolve, reject) => {
         const { email } = userInfo;
         const userId = uuid.v4();
         let user;

         // First, use email addr to see if it's already in redis.
         req.app.locals.redis.hgetallAsync(email)
            .then((cachedEmail) => {
               if (cachedEmail === null) {
                  // Otherwise, add user to cache add user table.
                  const status = 1;
                  const subscriberOrgId = uuid.v4();
                  const subscriberOrgName = req.body.displayName;
                  const subscriberUserId = uuid.v4();
                  const teamId = uuid.v4();
                  const teamName = 'All';
                  const teamMemberId = uuid.v4();
                  const teamRoomId = uuid.v4();
                  const teamRoomName = 'Lobby';
                  const teamRoomPurpose = 'Everyone to talk.';
                  const teamRoomPublish = true;
                  const teamRoomActive = true;
                  const TeamRoomMemberId = uuid.v4();

                  const { firstName, lastName, displayName, password, country, timeZone } = userInfo;
                  const icon = userInfo.icon || null;
                  const preferences = userInfo.preferences || { private: {} };
                  if (preferences.private === undefined) {
                     preferences.private = {};
                  }
                  user = {
                     emailAddress: email,
                     firstName,
                     lastName,
                     displayName,
                     password: hashPassword(password),
                     country,
                     timeZone,
                     icon,
                     preferences
                     // ,iconType
                  };

                  return Promise.all([
                     addUserToCache(req, email, userId, status),
                     createUserInDb(req, -1, userId, user),
                     subscriberOrgSvc.createSubscriberOrgUsingBaseName(req, { name: subscriberOrgName }, userId, subscriberOrgId),
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

                  user.userId = userId;
                  resolve(user);
                  userCreated(req, user);
               } else {
                  // Key is found in cache, user already registered.
                  console.log(`users-create: user ${email} found in cache`);
                  reject(new NoPermissionsError(email));
               }
            })
            .catch((err) => {
               reject(err);
            });
      });
   }

   updateUser(req, userId, updateInfo) {
      return new Promise((resolve, reject) => {
         getUsersByIds(req, [userId])
            .then((dbUsers) => {
               if (dbUsers.length < 1) {
                  throw new UserNotExistError(userId);
               }

               const user = dbUsers[0];
               resolve(user);
            })
            .catch(err => reject(err));
      });
   }
}

const userService = new UserService();
export default userService;
