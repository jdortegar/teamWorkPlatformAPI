import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import expressValidation from 'express-validation';
import httpStatus from 'http-status';
import jwt, { UnauthorizedError } from 'express-jwt';
import config from './env';
import { APIError, APIWarning } from '../services/errors';
import { googleSiteVerification } from '../integrations/google';
import { errorMiddleware as loggerErrorMiddleware, preAuthMiddleware, postAuthMiddleware } from '../logger';
import routes from '../routes';
import routesV2 from '../routes/api-v2';

const app = express();
app.enable('trust proxy');

app.use(cookieParser(config.signedCookieSecret));

// Hack for SNS incorrect content type "text/plain" when it should be "application/json".
// Forces bodyParser to parse JSON and put into req.body.
// https://forums.aws.amazon.com/thread.jspa?messageID=254070&#254070
app.use((req, res, next) => {
   if (req.get('x-amz-sns-message-type')) {
      req.headers['content-type'] = 'application/json';
   }
   next();
});

// Parse body params and attach them to req.body.
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({ origin: '*' })); // TODO: https://beta.habla.ai  This should match origins setting in messagingService.js.  Should be a variable.

app.use(preAuthMiddleware);

app.use(googleSiteVerification);

// Extract API version in request and put in request as "apiVersion", defaulting to 0.
app.use((req, res, next) => {
   let apiVersion = 0;

   const vMatch = req.url.match(/\/v\d+\//);
   if (vMatch !== null) {
      const vMatchStr = vMatch[0].substring(2, vMatch[0].length - 1);
      try {
         apiVersion = Number(vMatchStr);
         if (apiVersion > config.apiVersion) {
            throw new APIError(`Invalid API Version: ${vMatchStr}`, httpStatus.BAD_REQUEST);
         }
      } catch (err) {
         throw new APIError(`Invalid API Version: ${vMatchStr}`, httpStatus.BAD_REQUEST);
      }
   }

   req.apiVersion = apiVersion;
   next();
});

export const jwtMiddleware = jwt({ secret: config.jwtSecret });
app.use(
   jwtMiddleware.unless({
      path: [
         /^\/(v\d+\/)?test/,
         /^\/(v\d+\/)?users\/registerUser/,
         /^\/(v\d+\/)?users\/validateEmail/,
         /^\/(v\d+\/)?users\/createUser/,
         /^\/(v\d+\/)?users\/forgotPassword/,
         /^\/(v\d+\/)?users\/resetPassword/,
         /^\/(v\d+\/)?auth\/registerAWSCustomer/,
         /^\/(v\d+\/)?auth\/handleAWSEntitlementEvent/,
         /^\/(v\d+\/)?auth\/login/,
         /^\/(v\d+\/)?auth\/logout/,
         /^\/(v\d+\/)?integrations\/.*\/access/,
         /^\/(v\d+\/)?integrations\/.*\/app/,
         /^\/(v\d+\/)?integrations\/.*\/webhooks/,
         /^\/(v\d+\/)?users\/passwordreset/,
         /^\/(v\d+\/)?passwordupdate/,
         /^\/(v\d+\/)?payments/,
         /^\/(v\d+\/)?getcoupons/
      ]
   })
);

app.use(postAuthMiddleware);

// mount all routes on / path
app.use('/v2/', routesV2);
app.use('/', routes);
app.use('/v1/', routes);
// Catch 404 and forward to error handler.
app.use((req, res, next) => {
   const err = new APIError(httpStatus.NOT_FOUND, 'API not found');
   return next(err);
});

// If error is not an instanceOf APIError or APIWarning, convert it.
app.use((err, req, res, next) => {
   console.log(err);
   let e = err;
   if (err instanceof expressValidation.ValidationError) {
      const unifiedErrorMessage = err.errors
         .map(error => {
            return error.messages.join('. ');
         })
         .join(' and ');
      e = new APIError(err.status, unifiedErrorMessage);
   } else if (err instanceof UnauthorizedError) {
      req.logger.warn(err.message);
      res.status(httpStatus.UNAUTHORIZED).end();
      return;
   } else if (!(err instanceof APIError) && !(err instanceof APIWarning)) {
      e = new APIError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
   }

   next(e);
});

app.use(loggerErrorMiddleware);

app.use((err, req, res, next) => {
   // eslint-disable-line no-unused-vars
   res.status(err.status).json({
      status: err.status,
      message: err.message
   });
});

export default app;
