import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import SnsValidator from 'sns-validator';
import axios from 'axios';
import config from '../config/env';
import { jwtMiddleware } from '../config/express';
import APIError from '../helpers/APIError';
import { apiVersionedVisibility, publishByApiVersion } from '../helpers/publishedVisibility';
import { getAuthData, passwordMatch } from '../models/user';
import * as userSvc from '../services/userService';
import * as awsMarketplaceSvc from '../services/awsMarketplaceService';
import { InvalidAwsProductCodeError, CustomerExistsError } from '../services/errors';

export const AWS_CUSTOMER_ID_HEADER_NAME = 'x-hablaai-awsCustomerId';
export const AWS_CUSTOMER_ID_QUERY_NAME = 'awsCustomerId';


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
               const awsCustomerId = req.get(AWS_CUSTOMER_ID_HEADER_NAME);
               if (awsCustomerId) {
                  awsMarketplaceSvc.registerCustomer(req, awsCustomerId, user)
                     .then(() => {
                        res.status(httpStatus.OK).json({
                           status: 'SUCCESS',
                           token: jwt.sign(getAuthData(user, user.userId), config.jwtSecret),
                           user: publishByApiVersion(req, apiVersionedVisibility.privateUser, user),
                           websocketUrl: config.apiEndpoint,
                           resourcesBaseUrl: config.resourcesBaseUrl
                        });
                     })
                     .catch((err) => {
                        if (err instanceof CustomerExistsError) {
                           res.status(httpStatus.OK).json({
                              status: 'SUCCESS',
                              token: jwt.sign(getAuthData(user, user.userId), config.jwtSecret),
                              user: publishByApiVersion(req, apiVersionedVisibility.privateUser, user),
                              websocketUrl: config.apiEndpoint,
                              resourcesBaseUrl: config.resourcesBaseUrl,
                              postLoginUrl: `${config.webappBaseUri}/app/editSubscriberOrg` // TODO: customer id exists
                           });
                        } else {
                           next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
                        }
                     });
               } else {
                  res.status(httpStatus.OK).json({
                     status: 'SUCCESS',
                     token: jwt.sign(getAuthData(user, user.userId), config.jwtSecret),
                     user: publishByApiVersion(req, apiVersionedVisibility.privateUser, user),
                     websocketUrl: config.apiEndpoint,
                     resourcesBaseUrl: config.resourcesBaseUrl
                  });
               }
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

export const resolveAwsCustomer = (req, res, next) => {
   // const amznMarketplaceToken = req.body['x-amzn-marketplace-token'] || req.query['x-amzn-marketplace-token']; // TODO: remove query param.
   const amznMarketplaceToken = req.body['x-amzn-marketplace-token'];
   if (amznMarketplaceToken) {
      awsMarketplaceSvc.resolveCustomer(req, amznMarketplaceToken)
         .then((awsCustomerId) => {
            // TODO: Check if logged in.  What to do if already logged in?
            res.redirect(`${config.webappBaseUri}/login?${AWS_CUSTOMER_ID_QUERY_NAME}=${awsCustomerId}`);
         })
         .catch((err) => {
            if (err instanceof InvalidAwsProductCodeError) {
               next(new APIError(err, httpStatus.NOT_FOUND));
            } else {
               next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
            }
         });
   } else {
      next(new APIError('Amazon Marketplace Token not found.', httpStatus.NOT_FOUND));
   }
};

export const handleAWSEntitlementEvent = (req, res) => {
   const messageType = req.get('x-amz-sns-message-type');
   const event = req.body;
   const snsValidator = new SnsValidator();
   console.log(`AD: event=${JSON.stringify(event)}`); // eslint-disable-line no-console

   if (messageType === 'SubscriptionConfirmation') {
      snsValidator.validate(event, (error) => {
         if (error) {
            res.status(httpStatus.OK).end();
         } else {
            const { SubscribeURL } = event;
            axios.get(SubscribeURL);
         }
      });
      res.status(httpStatus.OK).end();
   } else if (messageType === 'Notification') {
      snsValidator.validate(event, (error) => {
         if (error) {
            res.status(httpStatus.OK).end();
         } else {
            const { Subject, Message } = event; // eslint-disable-line no-unused-vars
            awsMarketplaceSvc.updateCustomerEntitlements(req, Message)
               .then(() => res.status(httpStatus.OK).end())
               .catch(() => res.status(httpStatus.BAD_REQUEST).end());
         }
      });
   }
};
