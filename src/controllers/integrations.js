import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import { publicIntegrations } from '../helpers/publishedVisibility';
import * as integrationSvc from '../services/integrationService';

export function getIntegrations(req, res, next) { // eslint-disable-line import/prefer-default-export
   const userId = req.user._id;
   const subscriberOrgId = req.query.subscriberOrgId;

   integrationSvc.getIntegrations(req, userId, subscriberOrgId)
      .then((integrations) => {
         res.status(httpStatus.OK).json({ integrations: publicIntegrations(integrations) });
      })
      .catch((err) => {
         next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
      });
}
