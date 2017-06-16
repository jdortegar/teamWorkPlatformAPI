import httpStatus from 'http-status';
import config from '../config/env';
import APIError from '../helpers/APIError';
import * as googleSvc from '../services/googleService';
import { IntegrationAccessError, SubscriberOrgNotExistError } from '../services/errors';

const webappIntegrationUri = `${config.webappBaseUri}/integrations`;

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
   const redirectUri = `${webappIntegrationUri}?integration=google`;

   googleSvc.googleAccessResponse(req, req.query)
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
