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

var APIError = require('../helpers/APIError');
var config = require('../config/env');
var jwt = require('jsonwebtoken');
var httpStatus = require('http-status');
var User = require('../models/user');

function login(req, res, next) {
  var username = req.body.username || '';
  var password = req.body.password || '';
  req.app.locals.db.collection('users').findOne({
    userID: username
  }).then(function(user) {
    if (user && User.passwordMatch(user, password)) {
      res.json({
        status: 'SUCCESS',
        token: jwt.sign(User.getAuthData(user), config.jwtSecret),
        user: User.getPublicData(user)
      });
    } else {
      var err = new APIError('Invalid credentials', httpStatus.UNAUTHORIZED);
      return next(err);
    }
  }).catch(function(e) {
    next(e);
  });
}

module.exports = {
  login: login
};
