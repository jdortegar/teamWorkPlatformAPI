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

const bcrypt = new Bcrypt(11);

export function hashPassword(password) {
   return bcrypt.hash(password);
}

export function passwordMatch(user, password) {
   return Bcrypt.compare(password, user.password);
}

export function getAuthData(user, id) {
   return {
      _id: id,
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
