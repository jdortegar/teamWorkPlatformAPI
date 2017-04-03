//---------------------------------------------------------------------
// policies/index.js
// 
// policy enforcement logic
//---------------------------------------------------------------------
//  Date         Initials    Description
//  ----------   --------    ------------------------------------------
//  2017-02-02    RLA         Initial module creation
//
//---------------------------------------------------------------------

import APIError from '../helpers/APIError';
import httpStatus from 'http-status';

export const roles = {
  globalAdmin: 'globalAdmin',
  hablaUser: 'hablaUser',
  subscriberAdmin: 'subscriberAdmin',
  subscriberUser: 'subscriberUser'
};

export function containsRole(role) {
  return (req, res, next) => {
    const found = req.user.roles.find((elem) => {
      return elem.role == role;
    });
    if (found) {
      return next();
    }
    const err = new APIError('Forbidden', httpStatus.FORBIDDEN);
    return next(err);
  }
}

export function containsAnyRole(roles) {
  return (req, res, next) => {
    let found = false;

    roles.forEach((role) => {
      found = found || req.user.roles.find((elem) => {
        return elem.role == role;
      });
    });

    if (found) {
      return next();
    }
    const err = new APIError('Forbidden', httpStatus.FORBIDDEN);
    return next(err);
  }
}

