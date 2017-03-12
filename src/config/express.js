//---------------------------------------------------------------------
// config/express.js
// 
// configuration code for hablaapi service
//---------------------------------------------------------------------
//  Date         Initials    Description
//  ----------   --------    ------------------------------------------
//  2017-02-02    RLA         Initial module creation
//
//---------------------------------------------------------------------

var APIError = require('../helpers/APIError');
var bodyParser = require('body-parser');
var config = require('./env');
var cors = require('cors');
var express = require('express');
var expressValidation = require('express-validation');
var jwt = require('express-jwt');
var httpStatus = require('http-status');
var morgan = require('morgan');
var routes = require('../routes');

var app = express();

// parse body params and attach them to req.body
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(morgan('dev'));
app.use(cors());

app.use(jwt({
  secret: config.jwtSecret
}).unless({
  path: [/^\/test/, /^\/auth\/userAuth\/.*/, /^\/users/, /^\/users\/passwordreset/,/^\/users\/registerUser/, /^\/users\/validateEmail/, /^.*\/passwordupdate/]
}));

// mount all routes on / path
app.use('/', routes);

// if error is not an instanceOf APIError, convert it.
app.use(function(err, req, res, next) {
  if (err instanceof expressValidation.ValidationError) {
    var unifiedErrorMessage = err.errors.map(function(error) {
      return error.messages.join('. ');
    }).join(' and ');
    var error = new APIError(unifiedErrorMessage, err.status, true);
    return next(error);
  } else if (!(err instanceof APIError)) {
    var apiError = new APIError(err.message, err.status, err.isPublic);
    return next(apiError);
  }
  return next(err);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new APIError('API not found', httpStatus.NOT_FOUND);
  return next(err);
});

app.use(function(err, req, res, next) { // eslint-disable-line no-unused-vars
  res.status(err.status).json({
    message: err.message
  });
});

module.exports = app;
