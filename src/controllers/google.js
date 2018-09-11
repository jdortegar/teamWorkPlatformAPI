import httpStatus from 'http-status';
import config from '../config/env';
import * as googleSvc from '../services/googleService';
import { APIError, APIWarning, IntegrationAccessError, SubscriberOrgNotExistError } from '../services/errors';

const webappIntegrationUri = `${config.webappBaseUri}/app/integrations`;

export const integrateGoogle = (req, res, next) => {
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
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else {
            next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
         }
      });
};

export const googleAccess = (req, res) => {
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
};

export const revokeGoogle = (req, res, next) => {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;

   googleSvc.revokeGoogle(req, userId, subscriberOrgId)
      .then(() => {
         res.status(httpStatus.OK).end();
      })
      .catch((err) => {
         if (err instanceof SubscriberOrgNotExistError) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else if (err instanceof IntegrationAccessError) {
            next(new APIWarning(httpStatus.GONE, err));
         } else {
            next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
         }
      });
};

export const googleWebhooks = (req, res, next) => {
   googleSvc.webhookEvent(req)
      .then(() => res.status(httpStatus.ACCEPTED).end())
      .catch((err) => {
         req.logger.error(err);
         if (err instanceof IntegrationAccessError) {
            next(new APIWarning(httpStatus.FORBIDDEN, err));
         } else {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).end();
         }
      });
};

