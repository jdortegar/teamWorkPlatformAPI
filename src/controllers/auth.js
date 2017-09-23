//---------------------------------------------------------------------
// controllers/auth.js
//
// controller for auth service
//---------------------------------------------------------------------
//  Date         Initials    Description
//  ----------   --------    ------------------------------------------
//  2017-02-02    RLA         Initial module creation
//
//---------------------------------------------------------------------

import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import { jwtMiddleware } from '../config/express';
import APIError from '../helpers/APIError';
import { apiVersionedVisibility, publishByApiVersion } from '../helpers/publishedVisibility';
import { getAuthData, passwordMatch } from '../models/user';
import * as userSvc from '../services/userService';

export function login(req, res, next) {
   const username = req.body.username || '';
   const password = req.body.password || '';
   delete req.body.password;

   // Retrieve UUID from cache.
   req.app.locals.redis.hmgetAsync(`${config.redisPrefix}${username}`, 'uid', 'status')
      .then((redisResponse) => { // id=redisResponse[0], status=redisResponse[1]
         const userId = redisResponse[0];
         const status = redisResponse[1];
         if ((userId !== null) && (status === '1')) {
            // Retrieve user from DB.
            const docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
            const usersTable = `${config.tablePrefix}users`;
            const params = {
               TableName: usersTable,
               Key: {
                  partitionId: -1,
                  userId
               }
            };
            return docClient.get(params).promise();
         }

         // User not in cache.  Check DB.
         return userSvc.getUserByEmail(req, username, true);
      })
      .then((dbData) => {
         if (dbData) {
            let user;
            if (dbData.Item) {
               user = dbData.Item.userInfo;
               user.userId = dbData.Item.userId;
            } else {
               user = dbData.userInfo;
               user.userId = dbData.userId;
            }

            if ((user) && (passwordMatch(user, password))) {
               res.status(httpStatus.OK).json({
                  status: 'SUCCESS',
                  token: jwt.sign(getAuthData(user, user.userId), config.jwtSecret),
                  user: publishByApiVersion(req, apiVersionedVisibility.privateUser, user),
                  websocketUrl: config.apiEndpoint,
                  resourcesBaseUrl: config.resourcesBaseUrl
               });
               return;
            }
         }
         next(new APIError('Invalid credentials', httpStatus.UNAUTHORIZED));
      })
      .catch((err) => {
         next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
      });
}

export function logout(req, res) {
   jwtMiddleware(req, res, () => {
      const username = (req.user) ? req.user.email : undefined; // eslint-disable-line no-unused-vars
      // Nothing to do, for now.
   });

   res.status(httpStatus.OK).end();
}
