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

var APIError = require('../helpers/APIError');
var httpStatus = require('http-status');

var roles = {
  globalAdmin: 'globalAdmin',
  hablaUser: 'hablaUser',
  subscriberAdmin: 'subscriberAdmin',
  subscriberUser: 'subscriberUser'
};

function containsRole(role) {
  return function(req, res, next) {
    var found = req.user.roles.find(function(elem) {
      return elem.role == role;
    });
    if (found) {
      return next();
    }
    var err = new APIError('Forbidden', httpStatus.FORBIDDEN);
    return next(err);
  }
}

function containsAnyRole(roles) {
  return function(req, res, next) {
    var found = false;

    roles.forEach(function (role) {
      found = found || req.user.roles.find(function(elem) {
        return elem.role == role;
      });
    });

    if (found) {
      return next();
    }
    var err = new APIError('Forbidden', httpStatus.FORBIDDEN);
    return next(err);
  }
}

module.exports = {
  roles: roles,
  containsRole: containsRole,
  containsAnyRole: containsAnyRole
};
