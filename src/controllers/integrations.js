import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import { apiVersionedVisibility, publishByApiVersion } from '../helpers/publishedVisibility';
import * as integrationSvc from '../services/integrationService';
import {
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
         next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
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
         if (err instanceof SubscriberUserNotExistError) {
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof BadIntegrationConfigurationError) {
            res.status(httpStatus.BAD_REQUEST).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
         }
      });
};
