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

export const sharepointAccess = async (req, res) => {
   let redirectUri =  `${config.webappBaseUri}/app/integrations`;
   let teamLevel;
   let integrationContext;
   try {
      const teamLevelVal = await req.app.locals.redis.getAsync(`${sharepointSvc.hashKey(req.query.state)}#teamLevel`);
      integrationContext = await req.app.locals.redis.hgetallAsync(sharepointSvc.hashKey(sharepointSvc.deduceState(req)));
      teamLevel = teamLevelVal == 1;
      let redirectUri;
      if (teamLevel) {
         redirectUri = `${config.webappBaseUri}/app/teamIntegrations`;
      } 

      const subscriberId = await sharepointSvc.sharepointAccessResponse(req, req.query);
      res.redirect(`${redirectUri}/${subscriberId}/sharepoint/CREATED`);
   } catch (err) {
      const subscriberField = (teamLevel) ? 'teamId' : 'subscriberOrgId';
      const realError = err._chainedError || err;
      if (realError instanceof IntegrationAccessError) {
         res.redirect(`${redirectUri}/${integrationContext[subscriberField]}/sharepoint/FORBIDDEN`);
      } else if (realError instanceof SubscriberOrgNotExistError) {
         res.redirect(`${redirectUri}/${integrationContext[subscriberField]}/sharepoint/NOT_FOUND`);
      } else {
         res.redirect(`${redirectUri}/${integrationContext[subscriberField]}/sharepoint/INERNAL_SERVER_ERROR`);
      }

   }
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

