import httpStatus from 'http-status';
import * as teamSvc from '../../services/teamService';
import { apiVersionedVisibility, publishByApiVersion } from '../../helpers/publishedVisibility';
import {
    TeamExistsError,
    TeamNotExistError,
    NoPermissionsError,
    TeamMemberNotExistsError,
    RequestExists,
    RequestNotExists
} from '../../services/errors'
import { updateTeamMembersIntegrations } from '../../repositories/db/teamMembersTable';

export const updateTeam = async (req, res) => {
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
        return Promise.reject(err);
    }
}

export const publicTeams = async (req, res) => {
   try {
      const teams = await teamSvc.getPublicTeams(req, req.params.orgId);
      return res.json({ teams });
   } catch (err) {
      return Promise.reject(err);
   }
};

export const getPublicTeamMembers = async (req, res) => {
   try {
      const { teamId } = req.params;
      const teamUsers = await teamSvc.getPublicTeamMembers(req, teamId);
      return res.json({ teamMembers: publishByApiVersion(req, apiVersionedVisibility.publicUsers, teamUsers) });
   } catch (err) {
      if (err instanceof TeamNotExistError) {
         return res.status(httpStatus.NOT_FOUND).json({
            error: 'Not Found',
            message: 'Team not found'
         });
      }
      return Promise.reject(err);
   }
};

export const getRequests = async (req, res) => {
   try {
      const { orgId } = req.params;
      const teamAdminId = req.user._id;
      const requests = await teamSvc.getRequests(req, teamAdminId);
      return res.json({ requests });
   } catch (err) {
      return Promise.reject(err);
   }
};

export const joinRequest = async (req, res) => {
   try {
      const { orgId, teamId } = req.params;
      const { userId } = req.body;
      const request = await teamSvc.joinRequest(req, orgId, teamId, userId);
      return res.status(201).json({request});
   } catch (err) {
      if (err instanceof TeamNotExistError) {
         return res.status(httpStatus.NOT_FOUND).json({
            error: 'Not Found',
            message: 'Team not found'
         });
      }
      if (err instanceof RequestExists) {
         return res.status(httpStatus.CONFLICT).json({
            error: 'Conflict',
            message: 'Request already exist'
         });
      }
      return Promise.reject(err);
   }
};

export const requestResponse = async (req, res) => {
   try {
      const { orgId, teamId } = req.params;
      const { requestId, userId, teamAdminId, accepted } = req.body;

      const request = await teamSvc.joinRequestUpdate(req, orgId, teamId, userId, requestId, teamAdminId, accepted);
      return res.status(200).json({ request });
   } catch (err) {
      if (err instanceof TeamNotExistError) {
         return res.status(httpStatus.NOT_FOUND).json({
            error: 'Not Found',
            message: 'Team not found'
         });
      }
      if (err instanceof RequestNotExists) {
         return res.status(httpStatus.NOT_FOUND).json({
            error: 'Not Found',
            message: 'Request not found'
         });
      }

      return Promise.reject(err);
   }
};

export const updateTeamMember = async (req, res)  => {
   try {
       const updatedTeamMember = await teamSvc.updateTeamMember(req, req.params.userId, req.params.teamId, req.body);
       return res.json({
           userId: updatedTeamMember.userId,
           teamId: updatedTeamMember.teamId,
           orgId: updatedTeamMember.subscriberOrgId,
           role: updatedTeamMember.role,
           active: updatedTeamMember.enabled
       });
   } catch (err) {
       if (err instanceof TeamMemberNotExistsError) {
           return res.status(httpStatus.NOT_FOUND).json({
               error: 'Not Found',
               message: 'Team Member not Found',
           });
       }
       return Promise.reject(err);
   }
}
