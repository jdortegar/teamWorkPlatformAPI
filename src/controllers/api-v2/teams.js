import httpStatus from 'http-status';
import * as teamSvc from '../../services/teamService';
import * as userSvc from '../../services/userService';
import {
    TeamExistsError,
    TeamNotExistError,
    NoPermissionsError
} from '../../services/errors'

export const updateTeam = async (req, res, next) => {
    try {
        const updatedTeam = await teamSvc.updateTeam(req, req.params.teamId, req.body, req.user._id);
        return res.status(200).json(updatedTeam);
    } catch (err) {
        if (err instanceof TeamExistsError) {
            return res.status(httpStatus.CONFLICT).json({
                error: 'Conflict',
                message: 'Team Name Already exists',
            });
        }
        if (err instanceof TeamNotExistError) {
            return res.status(httpStatus.NOT_FOUND).json({
                error: 'Not Found',
                message: 'Team not found'
            });
        }
        if (err instanceof NoPermissionsError) {
            return res.status(httpStatus.FORBIDDEN).json({
                error: 'Forbidden',
                message: 'You do not have access rights to update this resource'
            });
        }
        throw err;
    }
}