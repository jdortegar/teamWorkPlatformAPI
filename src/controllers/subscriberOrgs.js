import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import { privateSubscriberOrg, publicSubscriberOrgs, publicUsers } from '../helpers/publishedVisibility';
import subscriberOrgSvc from '../services/subscriberOrgService';
import { InvitationNotExistError, NoPermissionsError, SubscriberOrgExistsError, SubscriberOrgNotExistError, UserNotExistError } from '../services/errors';

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

export function createSubscriberOrg(req, res, next) {
   const userId = req.user._id;

   subscriberOrgSvc.createSubscriberOrg(req, req.body, userId)
      .then((createdSubscriberOrg) => {
         res.status(httpStatus.CREATED).json(privateSubscriberOrg(createdSubscriberOrg));
      })
      .catch((err) => {
         if (err instanceof SubscriberOrgExistsError) {
            res.status(httpStatus.CONFLICT).json({ status: 'EXISTS' });
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
         }
      });
}

export function updateSubscriberOrg(req, res, next) {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;
   subscriberOrgSvc.updateSubscriberOrg(req, subscriberOrgId, req.body, userId)
      .then(() => {
         res.status(httpStatus.NO_CONTENT).end();
      })
      .catch((err) => {
         if (err instanceof SubscriberOrgNotExistError) {
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            next(new APIError(err, httpStatus.SERVICE_UNAVAILABLE));
         }
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

export function inviteSubscribers(req, res, next) {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;

   subscriberOrgSvc.inviteSubscribers(req, subscriberOrgId, req.body.userIdOrEmails, userId)
      .then(() => {
         res.status(httpStatus.ACCEPTED).end();
      })
      .catch((err) => {
         if ((err instanceof SubscriberOrgNotExistError) || (err instanceof UserNotExistError)) {
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
         }
      });
}

export function replyToInvite(req, res, next) {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;

   subscriberOrgSvc.replyToInvite(req, subscriberOrgId, req.body.accept, userId)
      .then(() => {
         res.status(httpStatus.OK).end();
      })
      .catch((err) => {
         if ((err instanceof SubscriberOrgNotExistError) || (err instanceof UserNotExistError) || (err instanceof InvitationNotExistError)) {
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
         }
      });
}
