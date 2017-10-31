//---------------------------------------------------------------------
// controllers/users.js
//
// controller for users object
//---------------------------------------------------------------------
//  Date         Initials    Description
//  ----------   --------    ------------------------------------------
//  2017-02-02    RLA         Initial module creation
//
//---------------------------------------------------------------------

import httpStatus from 'http-status';
import uuid from 'uuid';
import app from '../config/express';
import config from '../config/env';
import APIError from '../helpers/APIError';
import * as mailer from '../helpers/mailer';
import { NoPermissionsError, UserNotExistError } from '../services/errors';
import * as userSvc from '../services/userService';

/**
* Create a reservation for a user.
* A user is not created here.
* A reservation is ...
*/
export function createReservation(req, res) {
   const email = req.body.email || '';

   // Add new reservation to cache

   req.logger.debug(`createReservation: user ${email}`);
   const rid = uuid.v4(); // get a uid to represent the reservation
   req.logger.debug(`createReservation: new rid: ${rid}`);
   req.app.locals.redis.set(`${config.redisPrefix}${rid}`, email, 'EX', 1800, (err) => {
      if (err) {
         req.logger.debug('createReservation: hset status - redis error');
      } else {
         req.logger.debug(`createReservation: created reservation for email: ${email}`);
         mailer.sendActivationLink(email, rid).then(() => {
            const response = {
               status: 'SUCCESS',
               uuid: rid
            };
            res.status(httpStatus.CREATED).json(response);
         });
      }
   });
}

export function deleteRedisKey(rid) {
   return new Promise((resolve, reject) => {
      app.locals.redis.delAsync(`${config.redisPrefix}${rid}`)
         .then(() => resolve())
         .catch(err => reject(err));
   });
}

/**
 * Endpoint:   /user/validateEmail/:rid
 *
 * Method:     GET
 * Return 401: "Not Found"; body = { status: 'ERR_RESERVATION_NOT_FOUND' }
 *
 * @param req
 * @param res
 * @param next
 */
export function validateEmail(req, res) {
   const rid = req.params.rid || req.body.reservationId || '';

   // Find reservation in cache
   req.logger.debug(`find Reservation: id = ${rid}`);
   req.app.locals.redis.get(`${config.redisPrefix}${rid}`, (err, reply) => {
      if (err) {
         req.logger.debug('validateEmail: get status - redis error');
      } else if (reply) {
         req.logger.debug(`validateEmail: found reservation for email: ${reply}`);
         const response = {
            status: 'SUCCESS',
            email: reply
         };

         if (req.accepts('json')) {
            res.status(httpStatus.OK).json(response);
         } else {
            res.status(httpStatus.BAD_REQUEST).end();
         }
      } else {
         const response = {
            status: 'ERR_RESERVATION_NOT_FOUND'
         };
         res.status(httpStatus.NOT_FOUND).json(response);
      }
   });
}

export function createUser(req, res, next) {
   userSvc.createUser(req, req.body)
      .then(() => {
         res.status(httpStatus.CREATED).end();
      })
      .catch((err) => {
         if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            next(new APIError(err, httpStatus.SERVICE_UNAVAILABLE));
         }
      });
}

export function updateUser(req, res, next) {
   const userId = req.user._id;

   userSvc.updateUser(req, userId, req.body)
      .then(() => {
         res.status(httpStatus.NO_CONTENT).end();
      })
      .catch((err) => {
         if (err instanceof UserNotExistError) {
            res.status(httpStatus.NOT_FOUND).end();
         } else {
            next(new APIError(err, httpStatus.SERVICE_UNAVAILABLE));
         }
      });
}

export function updatePublicPreferences(req, res, next) {
   const userId = req.user._id;
   const updateUserId = req.params.userId;

   userSvc.updateUser(req, updateUserId, req.body, userId)
      .then(() => {
         res.status(httpStatus.NO_CONTENT).end();
      })
      .catch((err) => {
         if (err instanceof UserNotExistError) {
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            next(new APIError(err, httpStatus.SERVICE_UNAVAILABLE));
         }
      });
}

export function getInvitations(req, res, next) {
   const email = req.user.email;

   userSvc.getInvitations(req, email)
      .then(invitations => res.status(httpStatus.OK).json({ invitations }))
      .catch(err => next(new APIError(err, httpStatus.SERVICE_UNAVAILABLE)));
}
