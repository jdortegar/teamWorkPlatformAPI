import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import * as boxSvc from '../services/boxService';
import { IntegrationAccessError, SubscriberOrgNotExistError } from '../services/errors';

const webappIntegrationUri = `${config.webappBaseUri}/integrations`;

// ex. https://hablaapi.ngrok.io/integrations/box/integrate/:subscriberOrgId
export function integrateBox(req, res, next) {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;

   boxSvc.integrateBox(req, userId, subscriberOrgId)
      .then(boxUri => res.redirect(boxUri))
      .catch((err) => {
         if (err instanceof SubscriberOrgNotExistError) {
            res.status(httpStatus.NOT_FOUND).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR)); // TODO: redirect.
         }
      });
}

export function boxAccess(req, res, next) {
   const userId = req.user._id;

   boxSvc.boxAccessResponse(req, userId, req.query)
      .then(() => {
         res.redirect(`${webappIntegrationUri}?status=CREATED`);
      })
      .catch((err) => {
         if (err instanceof IntegrationAccessError) {
            res.redirect(`${webappIntegrationUri}?status=FORBIDDEN`);
         } else if (err instanceof SubscriberOrgNotExistError) {
            res.redirect(`${webappIntegrationUri}?status=NOT_FOUND`);
         } else {
            res.redirect(`${webappIntegrationUri}?status=INTERNAL_SERVER_ERROR`);
         }
      });
}
