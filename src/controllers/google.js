import httpStatus from 'http-status';
import config from '../config/env';
import APIError from '../helpers/APIError';
import * as googleSvc from '../services/googleService';
import { IntegrationAccessError, SubscriberOrgNotExistError } from '../services/errors';

const webappIntegrationUri = `${config.webappBaseUri}/app/integrations`;

export function integrateGoogle(req, res, next) {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;

   googleSvc.integrateGoogle(req, userId, subscriberOrgId)
      .then((googleUri) => {
         if (req.accepts('application/json')) {
            res.status(httpStatus.ACCEPTED).json({ location: googleUri });
         } else {
            res.redirect(googleUri);
         }
      })
      .catch((err) => {
         if (err instanceof SubscriberOrgNotExistError) {
            res.status(httpStatus.NOT_FOUND).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
         }
      });
}

export function googleAccess(req, res) {
   // Use referrer to get subscriberOrgId.
   const refererToks = req.headers.referer.split('/');
   const subscriberOrgId = refererToks[refererToks.length - 1];
   const redirectUri = `${webappIntegrationUri}/${subscriberOrgId}`;

   googleSvc.googleAccessResponse(req, req.query)
      .then(() => {
         res.redirect(`${redirectUri}?integration=google&status=CREATED`);
      })
      .catch((err) => {
         //res.redirect(`${redirectUri}?integration=google&status=CREATED`);
         /* TODO: */
         if (err instanceof IntegrationAccessError) {
            res.redirect(`${redirectUri}?integration=google&status=FORBIDDEN`);
         } else if (err instanceof SubscriberOrgNotExistError) {
            res.redirect(`${redirectUri}?integration=google&status=NOT_FOUND`);
         } else {
            res.redirect(`${redirectUri}?integration=google&status=INTERNAL_SERVER_ERROR`);
         }
      });
}

export function revokeGoogle(req, res, next) {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;

   googleSvc.revokeGoogle(req, userId, subscriberOrgId)
      .then(() => {
         res.status(httpStatus.OK).end();
      })
      .catch((err) => {
         if (err instanceof SubscriberOrgNotExistError) {
            res.status(httpStatus.NOT_FOUND).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
         }
      });
}

export function googleWebhooks(req, res) {
   googleSvc.webhookEvent(req)
      .then(() => res.status(httpStatus.ACCEPTED).end())
      .catch((err) => {
         req.logger.error(err);
         if (err instanceof IntegrationAccessError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).end();
         }
      });
}
