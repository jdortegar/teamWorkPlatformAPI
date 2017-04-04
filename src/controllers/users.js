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

import APIError from '../helpers/APIError';
import httpStatus from 'http-status';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import uuid from 'uuid';
import config from '../config/env';
import * as mailer from '../helpers/mailer';
import User, { hashPassword } from '../models/user';

/**
* Create a reservation for a user.
* A user is not created here.
* A reservation is ...
*/
export function createReservation(req, res, next) {
  const db = req.app.locals.db;
  const email = req.body.email || '';

  // Add new reservation to cache

  console.log(`createReservation: user ${email}`);
  const rid = uuid.v4(); // get a uid to represent the reservation
  console.log(`createReservation: new rid: ${rid}`);
  req.app.locals.redis.set(rid, email, 'EX', 1800, (err, reply) => {
    if (err) {
      console.log('createReservation: hset status - redis error');
    }
    else {
      console.log(`createReservation: created reservation for email: ${email}`);
      mailer.sendActivationLink(email, rid).then(() => {

        const response = {
          status: 'SUCCESS',
          uuid: rid
        };

        res.status(httpStatus.OK).json(response);

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
  const db = req.app.locals.db;
  const rid = req.params.rid || req.body.reservationId || '';

  // Find reservation in cache
  const email = "";
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
      var response = {
        status: 'ERR_RESERVATION_NOT_FOUND'
      };
      res.status(httpStatus.NOT_FOUND).json(response);
    }
  });
};

/**
 * Endpoint:   /user/
 *
 * Method:     POST
 * Body:       { firstName, lastName, displayName, email, password, country, timeZone }
 * Return 403: "Forbidden"; body = ...
 *
 * @param req
 * @param res
 * @param next
 */
export function create(req, res, next) {
  const db = req.app.locals.db;
  const email = req.body.email || '';

// first, use email addr to see if it's already in redis

  req.app.locals.redis.hget(email, 'uid', (err, reply) => {
      if (err) {
        console.log('users-create: redis error');
      }
      else if (reply) {

        //if key is found in cache, reply with user already registered

        console.log(`users-create: user ${email} found in cache`);
        console.log(`uid: ${reply}`);

        const _uid = reply;

        let userStatus = 0;

        req.app.locals.redis.hget(email, 'status', (err, reply) => {
          if (err) {
            console.log('users-create: get status - redis error');
          }
          else if (reply) {
            userStatus = reply;
            //console.log('reply: ' + reply);
          }
          console.log(`status: ${userStatus}`);

          const response = {
            status: 'ERR_USER_ALREADY_REGISTERED',
            uid: _uid,
            userStatus: userStatus
          };

          res.json(response);
          res.status(httpStatus.FORBIDDEN).json();
        });

      }
      else {
        // otherwise, add user to cache and to user table
        console.log(`users-create: user ${email} not in cache`);
        const uid = uuid.v4();
        console.log(`users-create: new uuid: ${uid}`);
        req.app.locals.redis.hmset(email, 'uid', uid, 'status', 1, (err, reply) => {
          if (err) {
            console.log('users-create: hmset status - redis error');
          }
          else {
            console.log(`users-create: created redis hash for email: ${email}`);
          }
        });

        req.app.locals.redis.hmget(email, 'uid', 'status', (err, reply) => {
          if (reply) {

            //reply.forEach((r, i) => {
            //  console.log('users-create: user rec from cache: ' + r);
            //});

          }
        });

        const docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
        const usersTable = `${config.tablePrefix}users`;

        // { firstName, lastName, displayName, email, password, country, timeZone }
         const { firstName, lastName, displayName, password, country, timeZone } = req.body;
        const params = {
            TableName: usersTable,
            Item:{
                "partitionId": -1,
                "userGuid": uid,
                "userInfo":{
                   "emailAddress": email,
                   firstName,
                   lastName,
                   displayName,
                   password: hashPassword(password),
                   country,
                   timeZone
                }
            }
        };

        console.log('Adding a new item...');
        docClient.put(params, (err, data) => {
            if (err) {
                console.error('Unable to add item. Error JSON:', JSON.stringify(err, null, 2));
            } else {
                console.log('Added item:', JSON.stringify(data, null, 2));
            }
        });

        mailer.sendActivationLink(email, uid).then(() => {

          const response = {
            status: 'SUCCESS',
            uuid: uid
          };
          res.json(response);
          res.status(httpStatus.OK).json();

        });

      }

  });

// if not, then get a uuid and add email / uuid to cache

// then add registration request to user table

/*
  userCollection.findOne({
    userID: username.toLowerCase()
  }).then((user) => {
    if (!user) {
      userCollection.findOne({
        emailAddress: email.toLowerCase()
      }).then((user) => {
        if (!user) {
          const newUser = {
            userID: username,
            emailAddress: email,
            createTimestamp: new Date(),
            siteGuid: req.body.siteGuid,
            roleMemberships: [{
              role: userRole
            }],
            userType: userType,
            defaultPage: defaultPage
          };
          userCollection.insert(newUser).then((savedUser) => {
            const token = generateToken();
            db.collection('passwordtoken').insertOne({
              userId: savedUser.ops[0]._id,
              token: token
            }).then(() => {
              mailer.sendActivationLink(req.body.email, token).then(() => {
                res.status(httpStatus.OK).json();
              });
            });
          }).catch((e) => {
            next(e);
          });
        } else {
          const err = new APIError('Email is already used', httpStatus.UNPROCESSABLE_ENTITY);
          return next(err);
        }
      }).catch((e) => {
        next(e);
      });
    } else {
      const err = new APIError('Username is already used', httpStatus.UNPROCESSABLE_ENTITY);
      return next(err);
    }
  }).catch((e) => {
    next(e);
  });
*/
}


export function del(req, res, next) {
  const db = req.app.locals.db;
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
                "partitionId": -1,
                "userGuid": uid

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

