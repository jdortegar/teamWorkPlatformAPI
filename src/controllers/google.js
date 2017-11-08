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
   // TODO: remove  const refererToks = req.headers.referer.split('/');
   // TODO: remove  const subscriberOrgId = refererToks[refererToks.length - 1];
   const redirectUri = `${webappIntegrationUri}`;

   let subscriberOrgId;

   googleSvc.googleAccessResponse(req, req.query)
      .then((stateSubscriberOrgId) => {
         subscriberOrgId = stateSubscriberOrgId;
         res.redirect(`${redirectUri}/${subscriberOrgId}/google/CREATED`);
      })
      .catch((err) => {
         subscriberOrgId = subscriberOrgId || err.subscriberOrgId;
         const realError = err._chainedError || err;
         if (realError instanceof IntegrationAccessError) {
            res.redirect(`${redirectUri}/${subscriberOrgId}/google/FORBIDDEN`);
         } else if (realError instanceof SubscriberOrgNotExistError) {
            res.redirect(`${redirectUri}/${subscriberOrgId}/google/NOT_FOUND`);
         } else {
            res.redirect(`${redirectUri}/${subscriberOrgId}/google/INTERNAL_SERVER_ERROR`);
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
         } else if (err instanceof IntegrationAccessError) {
            res.status(httpStatus.GONE).end();
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
