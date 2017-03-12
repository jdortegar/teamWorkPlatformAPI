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


var APIError = require('../helpers/APIError');
var httpStatus = require('http-status');
var crypto = require('crypto');
var mailer = require('../helpers/mailer');
var User = require('../models/user');
var config = require('../config/env');
var jwt = require('jsonwebtoken');
var uuid = require('node-uuid');
var Promise = require('bluebird');


function create(req, res, next) {
  var db = req.app.locals.db;
  var email = req.body.email || '';

// first, use email addr to see if it's already in redis

  req.app.locals.redis.hget(email, "uid", function(err, reply) {
      
      if (err) {
        console.log('users-create: redis error');
      }
      else if (reply) {

        //if key is found in cache, reply with user already registered

        console.log('users-create: user ' + email + ' found in cache');
        console.log('uid: ' + reply);

        var _uid = reply;

        var userStatus = 0;

        req.app.locals.redis.hget(email, "status", function(err, reply) {
          if (err) {
            console.log('users-create: get status - redis error');
          }
          else if (reply) {
            userStatus = reply;
            //console.log('reply: ' + reply);
          }
          console.log('status: ' + userStatus);

          var response = {
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

        console.log('users-create: user ' + email + ' not in cache');
        var uid = uuid.v4();
        console.log('users-create: new uuid: ' + uid);
        req.app.locals.redis.hmset(email, 'uid', uid, 'status', 1, function(err, reply) {
          if (err) {
            console.log('users-create: hmset status - redis error');
          }
          else {
            console.log('users-create: created redis hash for email: ' + email);
          }
        });

        req.app.locals.redis.hmget(email, 'uid', 'status', function(err, reply) {
          if (reply) {

            //reply.forEach(function(r, i) {
            //  console.log('users-create: user rec from cache: ' + r);
            //});

          }
        });

        var docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
        var usersTable = config.tablePrefix + "users"

        var params = {
            TableName: usersTable,
            Item:{
                "partitionId": -1,
                "userGuid": uid,
                "userInfo":{
                    "emailAddress": email
                }
            }
        };

        console.log("Adding a new item...");
        docClient.put(params, function(err, data) {
            if (err) {
                console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Added item:", JSON.stringify(data, null, 2));
            }
        });

        mailer.sendActivationLink(email, uid).then(function() {

          var response = {
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
  }).then(function(user) {
    if (!user) {
      userCollection.findOne({
        emailAddress: email.toLowerCase()
      }).then(function(user) {
        if (!user) {
          var newUser = {
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
          userCollection.insert(newUser).then(function(savedUser) {
            var token = generateToken();
            db.collection('passwordtoken').insertOne({
              userId: savedUser.ops[0]._id,
              token: token
            }).then(function() {
              mailer.sendActivationLink(req.body.email, token).then(function() {
                res.status(httpStatus.OK).json();
              });
            });
          }).catch(function(e) {
            next(e);
          });
        } else {
          var err = new APIError('Email is already used', httpStatus.UNPROCESSABLE_ENTITY);
          return next(err);
        }
      }).catch(function(e) {
        next(e);
      });
    } else {
      var err = new APIError('Username is already used', httpStatus.UNPROCESSABLE_ENTITY);
      return next(err);
    }
  }).catch(function(e) {
    next(e);
  });
*/
}


function del(req, res, next) {
  var db = req.app.locals.db;
  var email = req.body.email || '';
  var uid = req.body.uid || '';
  // first, use email addr to see if it's already in redis

  req.app.locals.redis.del(email, function(err, reply) {
    if (err) {
      console.log('user-delete: redis error');
    }
    else {

        var docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
        var usersTable = config.tablePrefix + "users"

        var params = {
            TableName: usersTable,
            Key:{
                "partitionId": -1,
                "userGuid": uid
                
            }
        };

        console.log("Deleting item...");
        docClient.delete(params, function(err, data) {
            if (err) {
                console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Deleted item:", JSON.stringify(data, null, 2));
            }
        });
    }
  });

  var response = {
    status: 'SUCCESS'
  };
  res.json(response);
  res.status(httpStatus.OK).json();

}


function update(req, res, next) {
  var currentUser = req.user;
  var email = req.body.email;
  var password = req.body.password;
  var salt = User.generateSalt();
  var toUpdate;

/*
  if (password) {
    toUpdate = {
      salt: salt,
      hashedPassword: User.encryptPassword(password, salt)
    }
  } else {
    toUpdate = {}
  }
  var handleResponse = function(user) {
    if (user) {
      res.json({
        status: 'SUCCESS',
        token: jwt.sign(User.getAuthData(user.value), config.jwtSecret),
        user: User.getPublicData(user.value)
      });
    } else {
      var err = new APIError('User not found', httpStatus.NOT_FOUND);
      return next(err);
    }
  };

  if (email !== currentUser.email) {
    usersCollection.findOne({
      emailAddress: email.toLowerCase()
    }).then(function(exist) {
      if (!exist) {
        toUpdate.emailAddress = email;
        usersCollection.findOneAndUpdate(filter, {
          $set: toUpdate
        }, {
          returnOriginal: false
        }).then(handleResponse).catch(function(e) {
          next(e);
        });
      } else {
        const err = new APIError('Email is already used', httpStatus.UNPROCESSABLE_ENTITY);
        return next(err);
      }
    }).catch(function (e) { return next(e); });
  } else if (password) {
    usersCollection.findOneAndUpdate(filter, {
      $set: toUpdate
    }, {
      returnOriginal: false
    }).then(handleResponse).catch(function(e) {
      next(e);
    });
  } else {
    res.json();
  }
*/
}

function resetPassword(req, res, next) {

  var email = req.body.email || '';
/*
  var db = req.app.locals.db;
  db.collection('users').findOne({
    emailAddress: req.body.email
  }).then(function(user) {
    if (user) {
      var token = generateToken();
      db.collection('passwordtoken').insertOne({
        userId: user._id,
        token: token
      }).then(function() {
*/        
  mailer.sendResetPassword(email, "test");

  res.status(httpStatus.OK).json();

}

function updatePassword(req, res, next) {
/*
  var db = req.app.locals.db;
  var newPassword = req.body.newPassword;
  var salt = User.generateSalt();
  db.collection('passwordtoken').findOne({
    token: req.body.token
  }).then(function(token) {
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
      }).then(function(user) {
        if (user) {
          res.json({
            status: 'SUCCESS',
            token: jwt.sign(User.getAuthData(user.value), config.jwtSecret),
            user: User.getPublicData(user.value)
          });
        } else {
          var err = new APIError('User not found', httpStatus.NOT_FOUND);
          return next(err);
        }
      }).catch(function(e) {
        next(e);
      });
    } else {
      var err = new APIError('Invalid token', httpStatus.NOT_FOUND);
      return next(err);
    }
  });
*/
}

function updateAgreement(req, res, next) {
  var agreement = req.body.agreement || false;

/*
  var filter = {
    _id: new ObjectID(req.params.userId)
  };
  var params = {
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
  req.app.locals.db.collection('users').findOneAndUpdate(filter, params).then(function(user) {
    res.json({
      status: 'SUCCESS',
      token: jwt.sign(User.getAuthData(user.value), config.jwtSecret),
      user: User.getPublicData(user.value)
    });
  }).catch(function(err) {
    next(err);
  });
*/
}

function generateToken() {
  var d = (new Date()).valueOf().toString();
  var ran = Math.random().toString();
  return crypto.createHash('sha1').update(d + ran).digest('hex');
}

module.exports = {
  create: create,
  update: update,
  del: del,
  resetPassword: resetPassword,
  updatePassword: updatePassword,
  updateAgreement: updateAgreement
};
