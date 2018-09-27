import httpStatus from 'http-status';
import { apiVersionedVisibility, publishByApiVersion } from '../../helpers/publishedVisibility';
import * as integrationSvc from '../../services/integrations/integrationService';
import { APIError } from '../../services/errors';

export const getTeamIntegrations = async (req, res, next) => {
    const teamId = req.params.teamId;
    try {
        const integrations = await integrationSvc.getTeamIntegrations(req, teamId);
        return res.status(httpStatus.OK).json( { teamMemberIntegrations: publishByApiVersion(req, apiVersionedVisibility.publicIntegrations, integrations) } );
    } catch (err) {
        return next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
    }
};