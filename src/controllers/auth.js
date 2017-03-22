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
import config from '../config/env';
import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import User from '../models/user';

export function login(req, res, next) {
  const username = req.body.username || '';
  const password = req.body.password || '';
  req.app.locals.db.collection('users').findOne({
    userID: username
  }).then((user) => {
    if (user && User.passwordMatch(user, password)) {
      res.json({
        status: 'SUCCESS',
        token: jwt.sign(User.getAuthData(user), config.jwtSecret),
        user: User.getPublicData(user)
      });
    } else {
      const err = new APIError('Invalid credentials', httpStatus.UNAUTHORIZED);
      return next(err);
    }
  }).catch((e) => {
    next(e);
  });
}

