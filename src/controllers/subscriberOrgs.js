import httpStatus from 'http-status';
import { apiVersionedVisibility, publishByApiVersion } from '../helpers/publishedVisibility';
import * as subscriberOrgSvc from '../services/subscriberOrgService';
import {
	APIError,
	APIWarning,
	CannotInviteError,
	InvitationNotExistError,
	NoPermissionsError,
	SubscriberOrgExistsError,
	SubscriberOrgNotExistError,
	UserNotExistError,
	SubscriberUserExistsError,
	UserLimitReached,
} from '../services/errors';

export const getSubscriberOrgs = (req, res, next) => {
	const userId = req.user._id;

	subscriberOrgSvc.getUserSubscriberOrgs(req, userId)
		.then((subscriberOrgs) => {
			res.status(httpStatus.OK).json({ subscriberOrgs: publishByApiVersion(req, apiVersionedVisibility.publicSubscriberOrgs, subscriberOrgs) });
		})
		.catch((err) => {
			next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
		});
};

export const createSubscriberOrg = (req, res, next) => {
	const userId = req.user._id;

	subscriberOrgSvc.createSubscriberOrg(req, req.body, userId)
		.then((createdSubscriberOrg) => {
			res.status(httpStatus.CREATED).json(publishByApiVersion(req, apiVersionedVisibility.privateSubscriberOrg, createdSubscriberOrg));
		})
		.catch((err) => {
			if (err instanceof SubscriberOrgExistsError) {
				next(new APIWarning(httpStatus.CONFLICT, err));
			} else if (err instanceof NoPermissionsError) {
				next(new APIWarning(httpStatus.FORBIDDEN, err));
			} else {
				next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
			}
		});
};

export const updateSubscriberOrg = (req, res, next) => {
	const userId = req.user._id;
	const subscriberOrgId = req.params.subscriberOrgId;
	subscriberOrgSvc.updateSubscriberOrg(req, subscriberOrgId, req.body, userId)
		.then(() => {
			res.status(httpStatus.NO_CONTENT).end();
		})
		.catch((err) => {
			if (err instanceof SubscriberOrgNotExistError) {
				next(new APIWarning(httpStatus.NOT_FOUND, err));
			} else if (err instanceof NoPermissionsError) {
				next(new APIWarning(httpStatus.FORBIDDEN, err));
			} else if (err instanceof SubscriberOrgExistsError) {
				next(new APIWarning(httpStatus.CONFLICT, err));
			} else {
				next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err));
			}
		});
};

export const getSubscriberOrgUsers = (req, res, next) => {
	const userId = req.user._id;
	const subscriberOrgId = req.params.subscriberOrgId;

	subscriberOrgSvc.getSubscriberOrgUsers(req, subscriberOrgId, userId)
		.then((subscriberOrgUsers) => {
			res.status(httpStatus.OK).json({ subscribers: publishByApiVersion(req, apiVersionedVisibility.publicUsers, subscriberOrgUsers) });
		})
		.catch((err) => {
			if (err instanceof SubscriberOrgNotExistError) {
				next(new APIWarning(httpStatus.NOT_FOUND, err));
			} else if (err instanceof NoPermissionsError) {
				next(new APIWarning(httpStatus.FORBIDDEN, err));
			} else {
				next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
			}
		});
};

export const inviteSubscribers = (req, res, next) => {
	const userId = req.user._id;
	const subscriberOrgId = req.params.subscriberOrgId;

	subscriberOrgSvc.inviteSubscribers(req, subscriberOrgId, req.body.userIdOrEmails, userId)
		.then(() => {
			res.status(httpStatus.ACCEPTED).end();
		})
		.catch((err) => {
			if ((err instanceof SubscriberOrgNotExistError) || (err instanceof UserNotExistError)) {
				next(new APIWarning(httpStatus.NOT_FOUND, err));
			} else if (err instanceof NoPermissionsError) {
				next(new APIWarning(httpStatus.FORBIDDEN, err));
			} else if (err instanceof CannotInviteError) {
				next(new APIWarning(httpStatus.METHOD_NOT_ALLOWED, err));
			} else if (err instanceof SubscriberOrgExistsError){
				return res.status(httpStatus.CONFLICT).json({
					error: 'Conflict',
					message: 'User already exists.'
            	})
			} else if (err instanceof UserLimitReached) { 
				return res.status(httpStatus.FORBIDDEN).json({
					error: 'Forbidden',
					type: 'UserLimitReached',
					message: `Max limit of  ${err.userLimit} invitation Reached.`
				});
			} else {
				next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
			}
		});
};

export const replyToInvite = (req, res, next) => {
	const userId = req.user._id;
	const subscriberOrgId = req.params.subscriberOrgId;

	subscriberOrgSvc.replyToInvite(req, subscriberOrgId, req.body.accept, userId)
		.then(() => {
			res.status(httpStatus.OK).end();
		})
		.catch((err) => {
			if ((err instanceof SubscriberOrgNotExistError) || (err instanceof UserNotExistError) || (err instanceof InvitationNotExistError)) {
				next(new APIWarning(httpStatus.NOT_FOUND, err));
			} else if (err instanceof NoPermissionsError) {
				next(new APIWarning(httpStatus.FORBIDDEN, err));
			} else {
				next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
			}
		});
};

