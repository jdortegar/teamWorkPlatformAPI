import httpStatus from 'http-status';
import { apiVersionedVisibility, publishByApiVersion } from '../helpers/publishedVisibility';
import * as teamSvc from '../services/teamService';
import {
   APIError,
   APIWarning,
   CannotDeactivateError,
   CannotInviteError,
   InvitationNotExistError,
   NoPermissionsError,
   NotActiveError,
   SubscriberOrgNotExistError,
   TeamExistsError,
   TeamNotExistError,
   UserNotExistError
} from '../services/errors';

export const getTeams = (req, res, next) => {
   const userId = req.user._id;
   const { subscriberOrgId } = req.query;

   teamSvc.getUserTeams(req, userId, subscriberOrgId)
      .then((teams) => {
         res.status(httpStatus.OK).json({ teams: publishByApiVersion(req, apiVersionedVisibility.publicTeams, teams) });
      })
      .catch((err) => {
         next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
      });
};

export const createTeam = (req, res, next) => {
   const userId = req.user._id;
   const subscriberOrgId = req.params.subscriberOrgId;

   teamSvc.createTeam(req, subscriberOrgId, req.body, userId)
      .then((createdTeam) => {
         res.status(httpStatus.CREATED).json(publishByApiVersion(req, apiVersionedVisibility.privateTeam, createdTeam));
      })
      .catch((err) => {
         if (err instanceof TeamExistsError) {
            next(new APIWarning(httpStatus.CONFLICT, err));
         } else if (err instanceof NoPermissionsError) {
            next(new APIWarning(httpStatus.FORBIDDEN, err));
         } else if (err instanceof SubscriberOrgNotExistError) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else if (err instanceof NotActiveError) {
            next(new APIWarning(httpStatus.METHOD_NOT_ALLOWED, err));
         } else {
            next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
         }
      });
};

export const updateTeam = (req, res, next) => {
   const userId = req.user._id;
   const teamId = req.params.teamId;
   teamSvc.updateTeam(req, teamId, req.body, userId)
      .then(() => {
         res.status(httpStatus.NO_CONTENT).end();
      })
      .catch((err) => {
         if (err instanceof TeamNotExistError) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else if (err instanceof NoPermissionsError) {
            next(new APIWarning(httpStatus.FORBIDDEN, err));
         } else if ((err instanceof TeamExistsError) || (err instanceof CannotDeactivateError)) {
            next(new APIWarning(httpStatus.CONFLICT, err));
         } else {
            next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err));
         }
      });
};

export const getTeamMembers = (req, res, next) => {
   const userId = req.user._id;
   const teamId = req.params.teamId;

   teamSvc.getTeamUsers(req, teamId, userId)
      .then((teamUsers) => {
         res.status(httpStatus.OK).json({ teamMembers: publishByApiVersion(req, apiVersionedVisibility.publicUsers, teamUsers) });
      })
      .catch((err) => {
         if (err instanceof TeamNotExistError) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else if (err instanceof NoPermissionsError) {
            next(new APIWarning(httpStatus.FORBIDDEN, err));
         } else {
            next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
         }
      });
};

export const inviteMembers = (req, res, next) => {
   const userId = req.user._id;
   const teamId = req.params.teamId;

   teamSvc.inviteMembers(req, teamId, req.body.userIds, userId)
      .then(() => {
         res.status(httpStatus.ACCEPTED).end();
      })
      .catch((err) => {
         if ((err instanceof TeamNotExistError) || (err instanceof UserNotExistError)) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else if (err instanceof NoPermissionsError) {
            next(new APIWarning(httpStatus.FORBIDDEN, err));
         } else if (err instanceof CannotInviteError) {
            next(new APIWarning(httpStatus.METHOD_NOT_ALLOWED, err));
         } else {
            next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
         }
      });
};

export const replyToInvite = (req, res, next) => {
   const userId = req.user._id;
   const teamId = req.params.teamId;

   teamSvc.replyToInvite(req, teamId, req.body.accept, userId)
      .then(() => {
         res.status(httpStatus.OK).end();
      })
      .catch((err) => {
         if ((err instanceof TeamNotExistError) || (err instanceof UserNotExistError) || (err instanceof InvitationNotExistError)) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else if (err instanceof NoPermissionsError) {
            next(new APIWarning(httpStatus.FORBIDDEN, err));
         } else {
            next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
         }
      });
};

