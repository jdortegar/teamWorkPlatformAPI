/**
---------------------------------------------------------------------
 config/express.js

 configuration code for hablaapi service
---------------------------------------------------------------------
  Date         Initials    Description
  ----------   --------    ------------------------------------------
  2017-02-02    RLA         Initial module creation

---------------------------------------------------------------------
*/

import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import expressValidation from 'express-validation';
import httpStatus from 'http-status';
import jwt, { UnauthorizedError } from 'express-jwt';
import config from './env';
import APIError from '../helpers/APIError';
import { errorMiddleware as loggerErrorMiddleware, preAuthMiddleware, postAuthMiddleware } from '../logger';
import routes from '../routes';

const app = express();

// Parse body params and attach them to req.body.
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({
   extended: true
}));

app.use(cors());

app.use(preAuthMiddleware);

app.use(jwt({
   secret: config.jwtSecret
}).unless({
   path: [/^\/test/, /^\/users\/registerUser/, /^\/users\/validateEmail/, /^\/users\/createUser/, /^\/auth\/login/, /^\/integrations\/box\/access/, /^\/users\/passwordreset/,  /^.*\/passwordupdate/]
}));

app.use(postAuthMiddleware);

// mount all routes on / path
app.use('/', routes);

// Catch 404 and forward to error handler.
app.use((req, res, next) => {
   const err = new APIError('API not found', httpStatus.NOT_FOUND);
   return next(err);
});

// If error is not an instanceOf APIError, convert it.
app.use((err, req, res, next) => {
   let e = err;
   if (err instanceof expressValidation.ValidationError) {
      const unifiedErrorMessage = err.errors.map((error) => {
         return error.messages.join('. ');
      }).join(' and ');
      e = new APIError(unifiedErrorMessage, err.status, true);
   } else if (err instanceof UnauthorizedError) {
      req.logger.warn(err.message);
      res.status(httpStatus.UNAUTHORIZED).end();
      return;
   } else if (!(err instanceof APIError)) {
      e = new APIError(err.message, err.status, err.isPublic);
   }

   next(e);
});

app.use(loggerErrorMiddleware);

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
   res.status(err.status).json({
      message: err.message
   });
});

export default app;
