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

import Bcrypt from '../helpers/Bcrypt';
import crypto from 'crypto';

const bcrypt = new Bcrypt(11);

export function hashPassword(password) {
  //return crypto.createHash('sha256').update(password).digest('hex');
   return bcrypt.hash(password);
}

export function passwordMatch(user, password) {
   return bcrypt.compare(password, user.password);
   // return user.hashedPassword === encryptPassword(pass, user.salt);
}

export function getPublicData(user) {
   const { emailAddress, firstName, lastName, displayName, country, timeZone, icon } = user;
   return {
      username: emailAddress,
      email: emailAddress,
      firstName,
      lastName,
      displayName,
      country,
      timeZone,
      icon,
      roleMemberships: user.roleMemberships,
      defaultPage: user.defaultPage,
      userType: user.userType || 'hablaUser'
   };
   // return {
   //    id: user._id,
   //    username: user.userID,
   //    email: user.emailAddress,
   //    name: user.displayName || user.userID,
   //    roleMemberships: user.roleMemberships,
   //    defaultPage: user.defaultPage,
   //    userType: user.userType || 'hablaUser'
   // };
}

export function getAuthData(user, id) {
  return {
    _id: (id) ? id : undefined,
    username: user.userName,
    email: user.emailAddress,
    roles: user.roleMemberships,
    siteGuid: user.siteGuid
  };
}

// export function generateSalt() {
//    return crypto.randomBytes(16).toString('hex');
// }

// export function encryptPassword(pass, salt) {
//    return crypto.createHmac('sha1', salt).update(pass).digest('hex');
// }

