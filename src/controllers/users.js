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

import crypto from 'crypto';
import httpStatus from 'http-status';
import uuid from 'uuid';
import config from '../config/env';
import APIError from '../helpers/APIError';
import * as mailer from '../helpers/mailer';
import User from '../models/user';
import { NoPermissionsError } from '../services/teamService';
import userService from '../services/userService';

/**
* Create a reservation for a user.
* A user is not created here.
* A reservation is ...
*/
export function createReservation(req, res, next) {
   const email = req.body.email || '';

   // Add new reservation to cache

   console.log(`createReservation: user ${email}`);
   const rid = uuid.v4(); // get a uid to represent the reservation
   console.log(`createReservation: new rid: ${rid}`);
   req.app.locals.redis.set(rid, email, 'EX', 1800, (err, reply) => {
      if (err) {
         console.log('createReservation: hset status - redis error');
      } else {
         console.log(`createReservation: created reservation for email: ${email}`);
         mailer.sendActivationLink(email, rid).then(() => {
            const response = {
               status: 'SUCCESS',
               uuid: rid
            };
            res.status(httpStatus.CREATED).json(response);
         });
      }
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
export function validateEmail(req, res, next) {
   const rid = req.params.rid || req.body.reservationId || '';

   // Find reservation in cache
   console.log(`find Reservation: id = ${rid}`);
   req.app.locals.redis.get(rid, (err, reply) => {
      if (err) {
         console.log('validateEmail: get status - redis error');
      }
      else if (reply) {
         console.log(`validateEmail: found reservation for email: ${reply}`);
         const response = {
            status: 'SUCCESS',
            email: reply
         };

         if (req.accepts('json')) {
            res.status(httpStatus.OK).json(response);
         } else {
            res.status(httpStatus.BAD_REQUEST).end();
         }
      }
      else {
         const response = {
            status: 'ERR_RESERVATION_NOT_FOUND'
         };
         res.status(httpStatus.NOT_FOUND).json(response);
      }
   });
};

export function createUser(req, res, next) {
   userService.createUser(req, req.body)
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
   userService.updateUser(req, userId, req.body)
      .then(() => {

      })
      .catch(err => next(new APIError(err, httpStatus.SERVICE_UNAVAILABLE)));
}

export function del(req, res, next) {
  const email = req.body.email || '';
  const uid = req.body.uid || '';
  // first, use email addr to see if it's already in redis

  req.app.locals.redis.del(email, (err, reply) => {
    if (err) {
      console.log('user-delete: redis error');
    }
    else {

        const docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
        const usersTable = `${config.tablePrefix}users`;

        const params = {
            TableName: usersTable,
            Key:{
               partitionId: -1,
               userId: uid

            }
        };

        console.log('Deleting item...');
        docClient.delete(params, (err, data) => {
            if (err) {
                console.error('Unable to delete item. Error JSON:', JSON.stringify(err, null, 2));
            } else {
                console.log('Deleted item:', JSON.stringify(data, null, 2));
            }
        });
    }
  });

  const response = {
    status: 'SUCCESS'
  };
  res.json(response);
  res.status(httpStatus.OK).json();

}


export function update(req, res, next) {
  const currentUser = req.user;
  const email = req.body.email;
  const password = req.body.password;
  const salt = User.generateSalt();
  let toUpdate;

/*
  if (password) {
    toUpdate = {
      salt: salt,
      hashedPassword: User.encryptPassword(password, salt)
    }
  } else {
    toUpdate = {}
  }
  const handleResponse = (user) => {
    if (user) {
      res.json({
        status: 'SUCCESS',
        token: jwt.sign(User.getAuthData(user.value), config.jwtSecret),
        user: User.getPublicData(user.value)
      });
    } else {
      const err = new APIError('User not found', httpStatus.NOT_FOUND);
      return next(err);
    }
  };

  if (email !== currentUser.email) {
    usersCollection.findOne({
      emailAddress: email.toLowerCase()
    }).then((exist) => {
      if (!exist) {
        toUpdate.emailAddress = email;
        usersCollection.findOneAndUpdate(filter, {
          $set: toUpdate
        }, {
          returnOriginal: false
        }).then(handleResponse).catch((e) => {
          next(e);
        });
      } else {
        const err = new APIError('Email is already used', httpStatus.UNPROCESSABLE_ENTITY);
        return next(err);
      }
    }).catch((e) => { return next(e); });
  } else if (password) {
    usersCollection.findOneAndUpdate(filter, {
      $set: toUpdate
    }, {
      returnOriginal: false
    }).then(handleResponse).catch((e) => {
      next(e);
    });
  } else {
    res.json();
  }
*/
}

export function resetPassword(req, res, next) {

  const email = req.body.email || '';
/*
  const db = req.app.locals.db;
  db.collection('users').findOne({
    emailAddress: req.body.email
  }).then((user) => {
    if (user) {
      const token = generateToken();
      db.collection('passwordtoken').insertOne({
        userId: user._id,
        token: token
      }).then(() => {
*/
  mailer.sendResetPassword(email, "test");

  res.status(httpStatus.OK).json();

}

export function updatePassword(req, res, next) {
/*
  const db = req.app.locals.db;
  const newPassword = req.body.newPassword;
  const salt = User.generateSalt();
  db.collection('passwordtoken').findOne({
    token: req.body.token
  }).then((token) => {
    if (token) {
      db.collection('users').findOneAndUpdate({
        _id: token.userId
      }, {
        $set: {
          salt: salt,
          hashedPassword: User.encryptPassword(newPassword, salt)
        }
      }, {
        returnOriginal: false
      }).then((user) => {
        if (user) {
          res.json({
            status: 'SUCCESS',
            token: jwt.sign(User.getAuthData(user.value), config.jwtSecret),
            user: User.getPublicData(user.value)
          });
        } else {
          const err = new APIError('User not found', httpStatus.NOT_FOUND);
          return next(err);
        }
      }).catch((e) => {
        next(e);
      });
    } else {
      const err = new APIError('Invalid token', httpStatus.NOT_FOUND);
      return next(err);
    }
  });
*/
}

export function updateAgreement(req, res, next) {
  const agreement = req.body.agreement || false;

/*
  const filter = {
    _id: new ObjectID(req.params.userId)
  };
  const params = {
    $set: {
      agreement: req.body.agreement
    }
  };
  if (agreement) {
    params.$addToSet = {
      roleMemberships: {
        role: 'PRELUDE_ACCESS'
      }
    };
  }
  req.app.locals.db.collection('users').findOneAndUpdate(filter, params).then((user) => {
    res.json({
      status: 'SUCCESS',
      token: jwt.sign(User.getAuthData(user.value), config.jwtSecret),
      user: User.getPublicData(user.value)
    });
  }).catch((err) => {
    next(err);
  });
*/
}

function generateToken() {
  const d = (new Date()).valueOf().toString();
  const ran = Math.random().toString();
  return crypto.createHash('sha1').update(d + ran).digest('hex');
}

