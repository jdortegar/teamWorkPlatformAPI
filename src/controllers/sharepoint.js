import httpStatus from 'http-status';
import config from '../config/env';
import * as sharepointSvc from '../services/sharepointService';
import { APIError, APIWarning, IntegrationAccessError, SubscriberOrgNotExistError } from '../services/errors';

const webappIntegrationUri = `${config.webappBaseUri}/app/integrations`;

// ex. https://hablaapi.ngrok.io/integrations/sharepoint/integrate/:subscriberOrgId/:sharepointOrg
export const integrateSharepoint = (req, res, next) => {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;
   const { sharepointOrg } = req.query;

   sharepointSvc.integrateSharepoint(req, userId, subscriberOrgId, sharepointOrg)
      .then((sharepointUri) => {
         if (req.accepts('application/json')) {
            res.status(httpStatus.ACCEPTED).json({ location: sharepointUri });
         } else {
            res.redirect(sharepointUri);
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

export const sharepointAccess = (req, res) => {
   const redirectUri = `${webappIntegrationUri}`;
   let subscriberOrgId;

   sharepointSvc.sharepointAccessResponse(req, req.query)
      .then((stateSubscriberOrgId) => {
         subscriberOrgId = stateSubscriberOrgId;
         res.redirect(`${redirectUri}/${subscriberOrgId}/sharepoint/CREATED`);
      })
      .catch((err) => { // err is always instance of IntegrationAccessError, which has subscriberOrgId and chained error.
         subscriberOrgId = subscriberOrgId || err.subscriberOrgId;
         const realError = err._chainedError || err;
         if (realError instanceof IntegrationAccessError) {
            res.redirect(`${redirectUri}/${subscriberOrgId}/sharepoint/FORBIDDEN`);
         } else if (realError instanceof SubscriberOrgNotExistError) {
            res.redirect(`${redirectUri}/${subscriberOrgId}/sharepoint/NOT_FOUND`);
         } else {
            res.redirect(`${redirectUri}/${subscriberOrgId}/sharepoint/INTERNAL_SERVER_ERROR`);
         }
      });
};

export const revokeSharepoint = (req, res, next) => {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;

   sharepointSvc.revokeSharepoint(req, userId, subscriberOrgId)
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

// export const boxWebhooks = (req, res) => {
//    boxSvc.webhookEvent(req)
//       .then(() => res.status(httpStatus.ACCEPTED).end())
//       .catch((err) => {
//          req.logger.error(err);
//          if (err instanceof IntegrationAccessError) {
//             next(new APIWarning(httpStatus.FORBIDDEN, err));
//          } else {
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).end();
//          }
//       });
// };

