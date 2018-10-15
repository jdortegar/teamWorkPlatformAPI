import httpStatus from 'http-status';
import config from '../config/env';
import * as dropboxSvc from '../services/dropboxService';
import { APIError, APIWarning, IntegrationAccessError, SubscriberOrgNotExistError } from '../services/errors';

const webappIntegrationUri = `${config.webappBaseUri}/app/integrations`;

export const integrateDropbox = (req, res, next) => {
    const userId = req.user._id;
    const subscriberOrgId = req.params.subscriberOrgId;
    dropboxSvc.integrateDropbox(req, userId, subscriberOrgId)
        .then((dropboxUri) => {
            if (req.accepts('application/json')) {
                res.status(httpStatus.ACCEPTED).json({ location: dropboxUri });
            } else {
                res.redirect(dropboxUri);
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

export const dropboxAccess = (req, res) => {
    const redirectUri = webappIntegrationUri;
    let subscriberOrgId;
    dropboxSvc.dropboxAccessResponse(req, req.query)
        .then((stateSubscriberOrgId) => {
            subscriberOrgId = stateSubscriberOrgId;
            res.redirect(`${redirectUri}/${subscriberOrgId}/dropbox/CREATED`);
        })
        .catch((err) => {
            subscriberOrgId = subscriberOrgId || err.subscriberOrgId;
            const realError = err._chainedError || err;
            if (realError instanceof IntegrationAccessError) {
                res.redirect(`${redirectUri}/${subscriberOrgId}/dropbox/FORBIDDEN`);
            } else if (realError instanceof SubscriberOrgNotExistError) {
                res.redirect(`${redirectUri}/${subscriberOrgId}/dropbox/NOT_FOUND`);
            } else {
                res.redirect(`${redirectUri}/${subscriberOrgId}/dropbox/INTERNAL_SERVER_ERROR`);
            }
        });
};

export const revokeDropbox = (req, res, next) => {
    const userId = req.user._id;
    const subscriberOrgId = req.params.subscriberOrgId;
    dropboxSvc.revokeDropbox(req, userId, subscriberOrgId)
        .then(() => {
            res.status(httpStatus.OK).end();
        })
        .catch((err) => {
            console.log(err);
            if (err instanceof SubscriberOrgNotExistError) {
                next(new APIWarning(httpStatus.NOT_FOUND, err));
            } else if (err instanceof IntegrationAccessError) {
                next(new APIWarning(httpStatus.GONE, err));
            } else {
                next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
            }
        });
};
