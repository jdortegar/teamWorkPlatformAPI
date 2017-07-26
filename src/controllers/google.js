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
   const redirectUri = `${webappIntegrationUri}`;

   googleSvc.googleAccessResponse(req, req.query)
      .then((subscriberOrgId) => {
         res.redirect(`${redirectUri}/${subscriberOrgId}?integration=google&status=CREATED`);
      })
      .catch((err) => {
         if (err instanceof IntegrationAccessError) {
            res.redirect(`${redirectUri}/subscriberOrgId?integration=google&status=FORBIDDEN`);
         } else if (err instanceof SubscriberOrgNotExistError) {
            res.redirect(`${redirectUri}/subscriberOrgId?integration=google&status=NOT_FOUND`);
         } else {
            res.redirect(`${redirectUri}/subscriberOrgId?integration=google&status=INTERNAL_SERVER_ERROR`);
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
