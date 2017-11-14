import httpStatus from 'http-status';
import config from '../config/env';
import APIError from '../helpers/APIError';
import * as boxSvc from '../services/boxService';
import { IntegrationAccessError, SubscriberOrgNotExistError } from '../services/errors';

const webappIntegrationUri = `${config.webappBaseUri}/app/integrations`;

// ex. https://hablaapi.ngrok.io/integrations/box/integrate/:subscriberOrgId
export const integrateBox = (req, res, next) => {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;

   boxSvc.integrateBox(req, userId, subscriberOrgId)
      .then((boxUri) => {
         if (req.accepts('application/json')) {
            res.status(httpStatus.ACCEPTED).json({ location: boxUri });
         } else {
            res.redirect(boxUri);
         }
      })
      .catch((err) => {
         if (err instanceof SubscriberOrgNotExistError) {
            res.status(httpStatus.NOT_FOUND).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
         }
      });
};

export const boxAccess = (req, res) => {
   const redirectUri = `${webappIntegrationUri}`;
   let subscriberOrgId;

   boxSvc.boxAccessResponse(req, req.query)
      .then((stateSubscriberOrgId) => {
         subscriberOrgId = stateSubscriberOrgId;
         res.redirect(`${redirectUri}/${subscriberOrgId}/box/CREATED`);
      })
      .catch((err) => { // err is always instance of IntegrationAccessError, which has subscriberOrgId and chained error.
         subscriberOrgId = subscriberOrgId || err.subscriberOrgId;
         const realError = err._chainedError || err;
         if (realError instanceof IntegrationAccessError) {
            res.redirect(`${redirectUri}/${subscriberOrgId}/box/FORBIDDEN`);
         } else if (realError instanceof SubscriberOrgNotExistError) {
            res.redirect(`${redirectUri}/${subscriberOrgId}/box/NOT_FOUND`);
         } else {
            res.redirect(`${redirectUri}/${subscriberOrgId}/box/INTERNAL_SERVER_ERROR`);
         }
      });
};

export const revokeBox = (req, res, next) => {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;

   boxSvc.revokeBox(req, userId, subscriberOrgId)
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
};

export const boxWebhooks = (req, res) => {
   boxSvc.webhookEvent(req)
      .then(() => res.status(httpStatus.ACCEPTED).end())
      .catch((err) => {
         req.logger.error(err);
         if (err instanceof IntegrationAccessError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).end();
         }
      });
};

