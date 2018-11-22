import httpStatus from 'http-status';
import uuid from 'uuid';
import app from '../config/express';
import config from '../config/env';
import * as mailer from '../helpers/mailer';
import { APIError, APIWarning, NoPermissionsError, UserNotExistError, UserLimitReached } from '../services/errors';
import * as userSvc from '../services/userService';
import { AWS_CUSTOMER_ID_HEADER_NAME } from './auth';
import { apiVersionedVisibility, publishByApiVersion } from '../helpers/publishedVisibility';

/**
* Create a reservation for a user.
* A user is not created here.
* A reservation is ...
*/
export const createReservation = (req, res) => {
    const email = req.body.email || '';
    const stripeSubscriptionId = req.body.subscriptionId || null;
    const awsCustomerId = req.get(AWS_CUSTOMER_ID_HEADER_NAME);
    const userLimit = req.body.userLimit || 5;

    // Add new reservation to cache

    req.logger.debug(`createReservation: user ${email}`);
    const rid = uuid.v4(); // get a uid to represent the reservation
    req.logger.debug(`createReservation: new rid: ${rid}`);
    req.app.locals.redis.hmset(`${config.redisPrefix}${rid}`, 'email', email, 'EX', 1800, (err) => {
        if (err) {
            req.logger.debug('createReservation: hset status - redis error');
        } else {
            req.logger.debug(`createReservation: created reservation for email: ${email}`);
            mailer.sendActivationLink(email, rid).then(() => {
                const response = {
                    status: 'SUCCESS'
                };
                res.status(httpStatus.CREATED).json(response);
            });
        }
    });

    if (awsCustomerId) {
        req.app.locals.redis.setAsync(`${config.redisPrefix}${email}#awsCustomerId`, awsCustomerId);
    }

    // If User comes from stripe
   if (stripeSubscriptionId) {
      req.app.locals.redis.setAsync(`${config.redisPrefix}${email}#stripeSubscriptionId`, stripeSubscriptionId);
   }
   req.app.locals.redis.setAsync(`${config.redisPrefix}${email}#userLimit`, userLimit);
};

export const forgotPassword = (req, res) => {
    const email = req.body.email || '';

    // Add new reservation to cache

    req.logger.debug(`createForgotPasswordReservation: user ${email}`);
    const rid = uuid.v4(); // get a uid to represent the reservation
    req.logger.debug(`createForgotPasswordReservation: new rid: ${rid}`);
    req.app.locals.redis.set(`${config.redisPrefix}${rid}`, email, 'EX', 1800, (err) => {
        if (err) {
            req.logger.debug('createForgotPasswordReservation: hset status - redis error');
        } else {
            req.logger.debug(`createReservation: created reservation for email: ${email}`);
            mailer.sendResetPassword(email, rid).then(() => {
                const response = {
                    status: 'SUCCESS',
                    uuid: rid
                };
                res.status(httpStatus.CREATED).json(response);
            });
        }
    });
};

export const deleteRedisKey = (rid) => {
    return new Promise((resolve, reject) => {
        app.locals.redis.delAsync(`${config.redisPrefix}${rid}`)
            .then(() => resolve())
            .catch(err => reject(err));
    });
};

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
export const validateEmail = (req, res, next) => {
    const rid = req.params.rid || req.body.reservationId || '';

    // Find reservation in cache
    req.logger.debug(`find Reservation: id = ${rid}`);
    req.app.locals.redis.hgetall(`${config.redisPrefix}${rid}`, (err, reply) => {
        if (err) {
            req.logger.debug('validateEmail: get status - redis error');
        } else if (reply) {
            req.logger.debug(`validateEmail: found reservation for email: ${reply}`);
            const response = {
                status: 'SUCCESS',
                email: reply.email
            };

            // If exists subscriberOrgName add to object
            if (reply && reply.subscriberOrgName){
                response.subscriberOrgName = reply.subscriberOrgName;
            }

            if (req.accepts('json')) {
                res.status(httpStatus.OK).json(response);
            } else {
                next(new APIWarning(httpStatus.BAD_REQUEST));
            }
        } else {
            next(new APIWarning(httpStatus.NOT_FOUND));
        }
    });
};

export const resetPassword = (req, res, next) => {
    const rid = req.params.rid || '';
    const password = req.body.password;

    delete req.body.password;

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
            userSvc.resetPassword(req, reply, password)
                .then(() => {
                    if (req.accepts('json')) {
                        res.status(httpStatus.OK).json(response);
                    } else {
                        next(new APIWarning(httpStatus.BAD_REQUEST));
                    }
                });
        } else {
            next(new APIWarning(httpStatus.NOT_FOUND));
        }
    });
};

export const createUser = (req, res, next) => {
    userSvc.createUser(req, req.body)
        .then(() => res.status(httpStatus.CREATED).end())
        .catch((err) => {
            if (err instanceof NoPermissionsError) {
                next(new APIWarning(httpStatus.FORBIDDEN, err));
            } else if (err instanceof UserLimitReached) {
                return res.status(httpStatus.FORBIDDEN).json({
                    error: 'Forbidden',
                    type: 'UserLimitReached',
                    message: `Max Limit of ${err.userLimit} user Reached`,
                })
            } else {
                next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err));
            }
        });
};

export const updateUser = async (req, res, next) => {
    const userId = req.query.userId || req.user._id;

    try {
        const updatedUser = await userSvc.updateUser(req, userId, req.body)
        return res.json(updatedUser[0]);
     } catch (err) {
        // Return error when email exists
        if (err instanceof UserNotExistError) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
        } else {
            next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err));
        }
     }
};

export const updatePassword = (req, res, next) => {
    const userId = req.user._id;
    const oldPassword = req.body.oldPassword;
    const newPassword = req.body.newPassword;

    delete req.body.oldPassword;
    delete req.body.newPassword;

    userSvc.updatePassword(req, userId, oldPassword, newPassword)
        .then(() => {
            res.status(httpStatus.NO_CONTENT).end();
        })
        .catch((err) => {
            if (err instanceof UserNotExistError) {
                next(new APIWarning(httpStatus.NOT_FOUND, err));
            } else {
                next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err));
            }
        });
};

// TODO: remove from API docs before removing.
// export const updatePublicPreferences = (req, res, next) => {
//    const userId = req.user._id;
//    const updateUserId = req.params.userId;
//
//    userSvc.updateUser(req, updateUserId, req.body, userId)
//       .then(() => {
//          res.status(httpStatus.NO_CONTENT).end();
//       })
//       .catch((err) => {
//          if (err instanceof UserNotExistError) {
//             res.status(httpStatus.NOT_FOUND).end();
//          } else if (err instanceof NoPermissionsError) {
//             res.status(httpStatus.FORBIDDEN).end();
//          } else {
//             next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err));
//          }
//       });
// };

export const getInvitations = (req, res, next) => {
    const email = req.user.email;

    userSvc.getInvitations(req, email)
        .then(invitations => res.status(httpStatus.OK).json({ invitations }))
        .catch(err => next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err)));
};

export const getSentInvitations = (req, res, next) => {
    const userId = req.user._id;
    const { since, state } = req.query;

    userSvc.getSentInvitations(req, userId, { since, state })
        .then(invitations => res.status(httpStatus.OK).json({ invitations: publishByApiVersion(req, apiVersionedVisibility.publicInvitations, invitations) }))
        .catch(err => next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err)));
};
