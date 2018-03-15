import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import { apiVersionedVisibility, publishByApiVersion } from '../helpers/publishedVisibility';
import * as teamRoomSvc from '../services/teamRoomService';
import {
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
         return next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
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
            res.status(httpStatus.CONFLICT).json({ status: 'EXISTS' });
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else if (err instanceof TeamNotExistError) {
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof NotActiveError) {
            res.status(httpStatus.METHOD_NOT_ALLOWED).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
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
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else if ((err instanceof TeamRoomExistsError) || (err instanceof CannotDeactivateError)) {
            res.status(httpStatus.CONFLICT).end();
         } else {
            next(new APIError(err, httpStatus.SERVICE_UNAVAILABLE));
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
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
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
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else if (err instanceof CannotInviteError) {
            res.status(httpStatus.METHOD_NOT_ALLOWED).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
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
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
         }
      });
};

