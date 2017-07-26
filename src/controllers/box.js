import httpStatus from 'http-status';
import config from '../config/env';
import APIError from '../helpers/APIError';
import * as boxSvc from '../services/boxService';
import { IntegrationAccessError, SubscriberOrgNotExistError } from '../services/errors';

const webappIntegrationUri = `${config.webappBaseUri}/app/integrations`;

// ex. https://hablaapi.ngrok.io/integrations/box/integrate/:subscriberOrgId
export function integrateBox(req, res, next) {
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
}

export function boxAccess(req, res) {
   const redirectUri = `${webappIntegrationUri}`;

   boxSvc.boxAccessResponse(req, req.query)
      .then((subscriberOrgId) => {
         res.redirect(`${redirectUri}/${subscriberOrgId}?integration=box&status=CREATED`);
      })
      .catch((err) => {
         if (err instanceof IntegrationAccessError) {
            res.redirect(`${redirectUri}/subscriberOrgId?integration=box&status=FORBIDDEN`);
         } else if (err instanceof SubscriberOrgNotExistError) {
            res.redirect(`${redirectUri}/subscriberOrgId?integration=box&status=NOT_FOUND`);
         } else {
            res.redirect(`${redirectUri}/subscriberOrgId?integration=box&status=INTERNAL_SERVER_ERROR`);
         }
      });
}

export function boxWebhooks(req, res) {
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
}
