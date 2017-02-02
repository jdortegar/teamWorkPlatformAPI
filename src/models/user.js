//---------------------------------------------------------------------
// models/user.js
// 
// model for user object
//---------------------------------------------------------------------
//  Date         Initials    Description
//  ----------   --------    ------------------------------------------
//  2017-02-02    RLA         Initial module creation
//
//---------------------------------------------------------------------

var crypto = require('crypto');

function hashPassword(pass) {
  return crypto.createHash('sha256').update(pass).digest('hex');
}

function getPublicData(user) {
  return {
    id: user._id,
    username: user.userID,
    email: user.emailAddress,
    name: user.displayName || user.userID,
    roleMemberships: user.roleMemberships,
    defaultPage: user.defaultPage,
    userType: user.userType || 'hablaUser'
  };
}

function getAuthData(user) {
  return {
    _id: user._id,
    username: user.userName,
    email: user.emailAddress,
    roles: user.roleMemberships,
    siteGuid: user.siteGuid
  };
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function encryptPassword(pass, salt) {
  return crypto.createHmac('sha1', salt).update(pass).digest('hex');
}

function passwordMatch(user, pass) {
  return user.hashedPassword === encryptPassword(pass, user.salt);
}

module.exports = {
  hashPassword: hashPassword,
  getPublicData: getPublicData,
  getAuthData: getAuthData,
  encryptPassword: encryptPassword,
  passwordMatch: passwordMatch,
  generateSalt: generateSalt
};
