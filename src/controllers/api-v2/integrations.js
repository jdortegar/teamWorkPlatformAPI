import httpStatus from 'http-status';
import { apiVersionedVisibility, publishByApiVersion } from '../../helpers/publishedVisibility';
import * as integrationSvc from '../../services/integrations/integrationService';
import { APIError, IntegrationNotExistError, SubscriberOrgNotExistError } from '../../services/errors';

export const getTeamIntegrations = async (req, res, next) => {
    const teamId = req.params.teamId;
    try {
        const integrations = await integrationSvc.getTeamIntegrations(req, teamId);
        return res.status(httpStatus.OK).json( { teamMemberIntegrations: publishByApiVersion(req, apiVersionedVisibility.publicIntegrations, integrations) } );
    } catch (err) {
        return next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
    }
};

export const refreshIntegration = async (req, res) => {
    try {
        const subscriberId = (typeof req.query.teamId !== 'undefined') ? req.query.teamId : req.params.orgId;
        const integration = req.params.integrationName;
        console.log('**PARAMS', req.params);
        const userId = req.user._id;
        const redirectUri = await integrationSvc.refreshIntegration(req, userId, subscriberId, integration);
        if (req.accepts('application/json')) {
            res.status(httpStatus.ACCEPTED).json({ location: redirectUri });
        } else {
            res.redirect(redirectUri);
        }
    } catch (err) {
        if (err instanceof IntegrationNotExistError) {
            return res.status(httpStatus.NOT_FOUND).json({
                error: 'Not Found',
                message: err.message
            });
        }
        if (err instanceof SubscriberOrgNotExistError) {
            return res.status(httpStatus.NOT_FOUND).json({
                error: 'Not Found',
                message: 'Subscriber not found'
            });
        }
        console.error(err);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            error: 'Internal Server Error',
            message: 'Something went wrong'
        });
    }
};
