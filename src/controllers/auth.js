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

import APIError from '../helpers/APIError';
import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import config from '../config/env';
import { getAuthData, getPublicData, passwordMatch } from '../models/user';

export function login(req, res, next) {
   const username = req.body.username || '';
   const password = req.body.password || '';

   // Retrieve UUID from cache.
   req.app.locals.redis.hmgetAsync(username, 'uid', 'status')
      .then((res) => { // id=res[0], status=res[1]
         const userGuid = res[0];
         const status = res[1];
         if ((userGuid !== null) && (status === '1')) {
            // Retrieve user from DB.
            const docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
            const usersTable = `${config.tablePrefix}users`;
            const params = {
               TableName: usersTable,
               Key: {
                  partitionId: -1,
                  userGuid
               }
            };
            return docClient.get(params).promise();
         }
         return undefined;
      })
      .then((dbData) => {
         if (dbData) {
            const user = dbData.Item.userInfo;
            if (passwordMatch(user, password)) {
               res.status(httpStatus.OK).json({
                  status: 'SUCCESS',
                  token: jwt.sign(getAuthData(user), config.jwtSecret),
                  user: getPublicData(user)
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

