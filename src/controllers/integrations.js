import httpStatus from 'http-status';
import { apiVersionedVisibility, publishByApiVersion } from '../helpers/publishedVisibility';
import * as integrationSvc from '../services/integrationService';
import {
   APIError, APIWarning,
   BadIntegrationConfigurationError, SubscriberUserNotExistError
} from '../services/errors';

export const getIntegrations = (req, res, next) => {
   const userId = req.user._id;
   const subscriberOrgId = req.query.subscriberOrgId;

   integrationSvc.getIntegrations(req, userId, subscriberOrgId)
      .then((integrations) => {
         res.status(httpStatus.OK).json({ integrations: publishByApiVersion(req, apiVersionedVisibility.publicIntegrations, integrations) });
      })
      .catch((err) => {
         next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
      });
};

export const configureIntegration = (req, res, next) => {
   const userId = req.user._id;
   const { target, subscriberOrgId } = req.params;
   const { body: configuration } = req;

   integrationSvc.configureIntegration(req, userId, subscriberOrgId, target, configuration)
      .then(() => {
         res.status(httpStatus.NO_CONTENT).end();
      })
      .catch((err) => {
         console.log('*****CONFIGURE ERROR', err);
         if (err instanceof SubscriberUserNotExistError) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else if (err instanceof BadIntegrationConfigurationError) {
            next(new APIWarning(httpStatus.BAD_REQUEST, err));
         } else {
            next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
         }
      });
};
