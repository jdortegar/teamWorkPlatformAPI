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

export const hashPassword = (password) => {
   return bcrypt.hash(password);
};

export const passwordMatch = (user, password) => {
   return Bcrypt.compare(password, user.password);
};

export const getAuthData = (req, user, id) => {
   let roles = [user.role];
   if (user.roleMemberships) {
      roles = roles.concat(user.roleMemberships);
   }
   return {
      _id: id,
      username: user.userName,
      email: user.emailAddress,
      _src: {
         userId: user.userId,
         address: req.ip,
         userAgent: req.headers['user-agent']
      },
      roles: roles,
      siteGuid: user.siteGuid
   };
};

