import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import subscriberOrgSvc, { SubscriberOrgNotExistError } from '../services/subscriberOrgService';
import { NoPermissionsError } from '../services/teamService';
import { publicSubscriberOrgs, publicUsers } from './publicData';

export function getSubscriberOrgs(req, res, next) {
   const userId = req.user._id;

   subscriberOrgSvc.getUserSubscriberOrgs(req, userId)
      .then((subscriberOrgs) => {
         res.status(httpStatus.OK).json({ subscriberOrgs: publicSubscriberOrgs(subscriberOrgs) });
      })
      .catch((err) => {
         console.error(err);
         next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
      });
}

export function getSubscriberOrgUsers(req, res, next) {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;

   subscriberOrgSvc.getSubscriberOrgUsers(req, subscriberOrgId, userId)
      .then((subscriberOrgUsers) => {
         res.status(httpStatus.OK).json({ subscribers: publicUsers(subscriberOrgUsers) });
      })
      .catch((err) => {
         if (err instanceof SubscriberOrgNotExistError) {
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
         }
      });
}
