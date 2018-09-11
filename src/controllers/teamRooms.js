import httpStatus from 'http-status';
import { apiVersionedVisibility, publishByApiVersion } from '../helpers/publishedVisibility';
import * as teamRoomSvc from '../services/teamRoomService';
import {
   APIError,
   APIWarning,
   CannotDeactivateError,
   CannotInviteError,
   InvitationNotExistError,
   NoPermissionsError,
   NotActiveError,
   TeamNotExistError,
   TeamRoomExistsError,
   TeamRoomNotExistError,
   UserNotExistError
} from '../services/errors';

export const getTeamRooms = (req, res, next) => {
   const userId = req.user._id;
   const { teamId, subscriberOrgId } = req.query;

   teamRoomSvc.getUserTeamRooms(req, userId, { teamId, subscriberOrgId })
      .then((teamRooms) => {
         res.status(httpStatus.OK).json({ teamRooms: publishByApiVersion(req, apiVersionedVisibility.publicTeamRooms, teamRooms) });
      })
      .catch((err) => {
         return next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
      });
};

export const createTeamRoom = (req, res, next) => {
   const userId = req.user._id;
   const teamId = req.params.teamId;

   teamRoomSvc.createTeamRoom(req, teamId, req.body, userId)
      .then((createdTeamRoom) => {
         res.status(httpStatus.CREATED).json(publishByApiVersion(req, apiVersionedVisibility.privateTeamRoom, createdTeamRoom));
      })
      .catch((err) => {
         if (err instanceof TeamRoomExistsError) {
            next(new APIWarning(httpStatus.CONFLICT, err));
         } else if (err instanceof NoPermissionsError) {
            next(new APIWarning(httpStatus.FORBIDDEN, err));
         } else if (err instanceof TeamNotExistError) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else if (err instanceof NotActiveError) {
            next(new APIWarning(httpStatus.METHOD_NOT_ALLOWED, err));
         } else {
            next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
         }
      });
};

export const updateTeamRoom = (req, res, next) => {
   const userId = req.user._id;
   const teamRoomId = req.params.teamRoomId;
   teamRoomSvc.updateTeamRoom(req, teamRoomId, req.body, userId)
      .then(() => {
         res.status(httpStatus.NO_CONTENT).end();
      })
      .catch((err) => {
         if (err instanceof TeamRoomNotExistError) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else if (err instanceof NoPermissionsError) {
            next(new APIWarning(httpStatus.FORBIDDEN, err));
         } else if ((err instanceof TeamRoomExistsError) || (err instanceof CannotDeactivateError)) {
            next(new APIWarning(httpStatus.CONFLICT, err));
         } else {
            next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err));
         }
      });
};

export const getTeamRoomMembers = (req, res, next) => {
   const userId = req.user._id;
   const teamRoomId = req.params.teamRoomId;

   teamRoomSvc.getTeamRoomUsers(req, teamRoomId, userId)
      .then((teamRoomUsers) => {
         res.status(httpStatus.OK).json({ teamRoomMembers: publishByApiVersion(req, apiVersionedVisibility.publicUsers, teamRoomUsers) });
      })
      .catch((err) => {
         if (err instanceof TeamRoomNotExistError) {
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
   const teamRoomId = req.params.teamRoomId;

   teamRoomSvc.inviteMembers(req, teamRoomId, req.body.userIds, userId)
      .then(() => {
         res.status(httpStatus.ACCEPTED).end();
      })
      .catch((err) => {
         if ((err instanceof TeamRoomNotExistError) || (err instanceof UserNotExistError)) {
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
   const teamRoomId = req.params.teamRoomId;

   teamRoomSvc.replyToInvite(req, teamRoomId, req.body.accept, userId)
      .then(() => {
         res.status(httpStatus.OK).end();
      })
      .catch((err) => {
         if ((err instanceof TeamRoomNotExistError) || (err instanceof UserNotExistError) || (err instanceof InvitationNotExistError)) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else if (err instanceof NoPermissionsError) {
            next(new APIWarning(httpStatus.FORBIDDEN, err));
         } else {
            next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
         }
      });
};

