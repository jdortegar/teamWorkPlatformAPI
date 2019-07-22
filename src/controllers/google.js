import httpStatus from 'http-status';
import config from '../config/env';
import * as googleSvc from '../services/googleService';
import { APIError, APIWarning, IntegrationAccessError, SubscriberOrgNotExistError } from '../services/errors';

export const integrateGoogle = (req, res, next) => {
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
                next(new APIWarning(httpStatus.NOT_FOUND, err));
            } else {
                next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
            }
        });
};

export const googleAccess = async (req, res) => {
    // Use referrer to get subscriberOrgId.
    // TODO: remove  const refererToks = req.headers.referer.split('/');
    // TODO: remove  const subscriberOrgId = refererToks[refererToks.length - 1];
    let redirectUri;
    try {
        const teamLevelVal = await req.app.locals.redis.getAsync(`${googleSvc.hashKey(req.query.state)}#teamLevel`) || 0;
        const teamLevel = teamLevelVal == 1;
        if (teamLevel) {
            redirectUri = `${config.webappBaseUri}/app/teamIntegrations`;
        } else  {
            redirectUri = `${config.webappBaseUri}/app/integrations`;
        }
        const subscriberId = await googleSvc.googleAccessResponse(req, req.query);
        res.redirect(`${redirectUri}/${subscriberId}/google/CREATED`);
    } catch (err) {
        const subscriberId = err.subscriberId;
        const realError = err._chainedError || err;
        if (realError instanceof IntegrationAccessError) {
            res.redirect(`${redirectUri}/${subscriberId}/google/FORBIDDEN`);
        } else if (realError instanceof SubscriberOrgNotExistError) {
            res.redirect(`${redirectUri}/${subscriberId}/google/NOT_FOUND`);
        } else {
            res.redirect(`${redirectUri}/${subscriberId}/google/INERNAL_SERVER_ERROR`);
        }
    }
};

export const revokeGoogle = (req, res, next) => {
    const userId = req.user._id;
    const subscriberOrgId = req.params.subscriberOrgId;

    googleSvc.revokeGoogle(req, userId, subscriberOrgId)
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

export const googleWebhooks = (req, res, next) => {
    googleSvc.webhookEvent(req)
        .then(() => res.status(httpStatus.ACCEPTED).end())
        .catch((err) => {
            req.logger.error(err);
            if (err instanceof IntegrationAccessError) {
                next(new APIWarning(httpStatus.FORBIDDEN, err));
            } else {
                res.status(httpStatus.INTERNAL_SERVER_ERROR).end();
            }
        });
};

