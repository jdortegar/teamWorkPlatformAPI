import httpStatus from 'http-status';
import { apiVersionedVisibility, publishByApiVersion } from '../../helpers/publishedVisibility';
import * as integrationSvc from '../../services/integrations/integrationService';
import { APIError } from '../../services/errors';

export const getTeamIntegrations = (req, res, next) => {
    const teamId = req.param.teamId;
    try {
        const integrations = integrationSvc.getTeamIntegrations(req, teamId);
        return res.status(httpStatus.OK).json( { integrations: publishByApiVersion(req, apiVersionedVisibility.publicIntegrations, integrations) } );
    } catch (err) {
        return next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
    }
};