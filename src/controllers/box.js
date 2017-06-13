import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import * as boxSvc from '../services/boxService';
import config from '../config/env';
import { IntegrationAccessError, SubscriberOrgNotExistError } from '../services/errors';

const webappIntegrationUri = `${config.webappBaseUri}/integrations`;

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
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR)); // TODO: redirect.
         }
      });
}

export function boxAccess(req, res) {
   const redirectUri = `${webappIntegrationUri}?integration=box`;

   boxSvc.boxAccessResponse(req, req.query)
      .then(() => {
         res.redirect(`${redirectUri}&status=CREATED`);
      })
      .catch((err) => {
         if (err instanceof IntegrationAccessError) {
            res.redirect(`${redirectUri}&status=FORBIDDEN`);
         } else if (err instanceof SubscriberOrgNotExistError) {
            res.redirect(`${redirectUri}&status=NOT_FOUND`);
         } else {
            res.redirect(`${redirectUri}&status=INTERNAL_SERVER_ERROR`);
         }
      });
}
