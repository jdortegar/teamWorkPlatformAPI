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

var httpStatus = require('http-status');
var util = require('util');

function APIError(message, status) {
  Error.call(this, message);

  this.name = this.constructor.name;
  this.message = message;
  this.status = status || httpStatus.INTERNAL_SERVER_ERROR;
  Error.captureStackTrace(this, this.constructor.name);
}
util.inherits(APIError, Error);

module.exports = APIError;
