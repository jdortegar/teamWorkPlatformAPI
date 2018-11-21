import httpStatus from 'http-status';
import config from '../config/env';
import * as salesforceSvc from '../services/salesforceService';
import { APIError, APIWarning, IntegrationAccessError, SubscriberOrgNotExistError } from '../services/errors';

export const integrateSalesforce = (req, res, next) => {
    const userId = req.user._id;
    const subscriberOrgId = req.params.subscriberOrgId;

    salesforceSvc.integrateSalesforce(req, userId, subscriberOrgId)
        .then((salesforceUri) => {
            if (req.accepts('application/json')) {
                res.status(httpStatus.ACCEPTED).json({ location: salesforceUri });
            } else {
                res.redirect(salesforceUri);
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

export const salesforceAccess = async (req, res) => {
    try {
        const teamLevelVal = await req.app.locals.redis.getAsync(`${salesforceSvc.hashKey(req.query.state)}#teamLevel`) || 0;
        const teamLevel = teamLevelVal == 1;
        let redirectUri;
        if (teamLevel) {
            redirectUri = `${config.webappBaseUri}/app/teamIntegrations`;
        } else  {
            redirectUri = `${config.webappBaseUri}/app/integrations`;
        }
        const subscriberId = await salesforceSvc.salesforceAccessResponse(req, req.query);
        res.redirect(`${redirectUri}/${subscriberId}/salesforce/CREATED`);
    } catch (err) {
        const subscriberId = err.subscriberOrgId;
        const realError = err._chainedError || err;
        if (realError instanceof IntegrationAccessError) {
            res.redirect(`${redirectUri}/${subscriberId}/salesforce/FORBIDDEN`);
        } else if (realError instanceof SubscriberOrgNotExistError) {
            res.redirect(`${redirectUri}/${subscriberId}/salesforce/NOT_FOUND`);
        } else {
            res.redirect(`${redirectUri}/${subscriberId}/salesforce/INERNAL_SERVER_ERROR`);
        }
    }
};

export const revokeSalesforce = (req, res, next) => {
    const userId = req.user._id;
    const subscriberOrgId = req.params.subscriberOrgId;
    salesforceSvc.revokeSalesforce(req, userId, subscriberOrgId)
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
