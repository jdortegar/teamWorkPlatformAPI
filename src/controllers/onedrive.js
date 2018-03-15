import httpStatus from 'http-status';
import config from '../config/env';
import APIError from '../helpers/APIError';
import * as onedriveSvc from '../services/onedriveService';
import { IntegrationAccessError, SubscriberOrgNotExistError } from '../services/errors';

const webappIntegrationUri = `${config.webappBaseUri}/app/integrations`;

export const integrateOnedrive = (req, res, next) => {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;

   onedriveSvc.integrateOnedrive(req, userId, subscriberOrgId)
      .then((onedriveUri) => {
         if (req.accepts('application/json')) {
            res.status(httpStatus.ACCEPTED).json({ location: onedriveUri });
         } else {
            res.redirect(onedriveUri);
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

export const onedriveAccess = (req, res) => {
   const redirectUri = `${webappIntegrationUri}`;
   let subscriberOrgId;

   onedriveSvc.onedriveAccessResponse(req, req.query)
      .then((stateSubscriberOrgId) => {
         subscriberOrgId = stateSubscriberOrgId;
         res.redirect(`${redirectUri}/${subscriberOrgId}/onedrive/CREATED`);
      })
      .catch((err) => { // err is always instance of IntegrationAccessError, which has subscriberOrgId and chained error.
         subscriberOrgId = subscriberOrgId || err.subscriberOrgId;
         const realError = err._chainedError || err;
         if (realError instanceof IntegrationAccessError) {
            res.redirect(`${redirectUri}/${subscriberOrgId}/onedrive/FORBIDDEN`);
         } else if (realError instanceof SubscriberOrgNotExistError) {
            res.redirect(`${redirectUri}/${subscriberOrgId}/onedrive/NOT_FOUND`);
         } else {
            res.redirect(`${redirectUri}/${subscriberOrgId}/onedrive/INTERNAL_SERVER_ERROR`);
         }
      });
};

export const revokeOnedrive = (req, res, next) => {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;

   onedriveSvc.revokeOnedrive(req, userId, subscriberOrgId)
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

