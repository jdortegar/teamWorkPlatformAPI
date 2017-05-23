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
import APIError from '../helpers/APIError';
import { privateUser } from '../helpers/publishedVisibility';
import { getAuthData, passwordMatch } from '../models/user';

export function login(req, res, next) {
   const username = req.body.username || '';
   const password = req.body.password || '';

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
         return undefined;
      })
      .then((dbData) => {
         if (dbData) {
            const user = dbData.Item.userInfo;
            user.userId = dbData.Item.userId;

            if (passwordMatch(user, password)) {
               res.status(httpStatus.OK).json({
                  status: 'SUCCESS',
                  token: jwt.sign(getAuthData(user, dbData.Item.userId), config.jwtSecret),
                  user: privateUser(user),
                  websocketUrl: config.apiEndpoint
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
   const username = req.user.email;

   req.app.locals.redis.delAsync(`${config.redisPrefix}${username}`)
      .then(() => res.status(httpStatus.OK))
      .catch((err) => {
         req.logger.error(err);
         res.status(httpStatus.OK);
      });
}
