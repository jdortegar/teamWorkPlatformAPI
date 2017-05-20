//---------------------------------------------------------------------
// helpers/APIError.js
//
// helper function to process API Error messages
//---------------------------------------------------------------------
//  Date         Initials    Description
//  ----------   --------    ------------------------------------------
//  2017-02-02    RLA         Initial module creation
//
//---------------------------------------------------------------------

import httpStatus from 'http-status';
// import util from 'util';

// TODO: convert to "class APIError extends Error..."
// export default function APIError(message, status) {
//   Error.call(this, message);
//
//   this.name = this.constructor.name;
//   this.message = message;
//   this.status = status || httpStatus.INTERNAL_SERVER_ERROR;
//   Error.captureStackTrace(this, this.constructor.name);
// }
// util.inherits(APIError, Error);

export default class APIError extends Error {
   status;

   constructor(message, status) {
      super(message);
      this.status = status || httpStatus.INTERNAL_SERVER_ERROR;
      Error.captureStackTrace(this, APIError);
   }
}
