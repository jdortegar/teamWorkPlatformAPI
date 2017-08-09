import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import { privateTeamRoom, publicTeamRooms, publicUsers } from '../helpers/publishedVisibility';
import * as teamRoomSvc from '../services/teamRoomService';
import {
   CannotDeactivateError,
   InvitationNotExistError,
   NoPermissionsError,
   TeamRoomExistsError,
   TeamRoomNotExistError,
   UserNotExistError
} from '../services/errors';

export function getTeamRooms(req, res, next) {
   const userId = req.user._id;
   const { teamId, subscriberOrgId } = req.query;

   teamRoomSvc.getUserTeamRooms(req, userId, { teamId, subscriberOrgId })
      .then((teamRooms) => {
         res.status(httpStatus.OK).json({ teamRooms: publicTeamRooms(teamRooms) });
      })
      .catch((err) => {
         return next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
      });
}

export function createTeamRoom(req, res, next) {
   const userId = req.user._id;
   const teamId = req.params.teamId;

   teamRoomSvc.createTeamRoom(req, teamId, req.body, userId)
      .then((createdTeamRoom) => {
         res.status(httpStatus.CREATED).json(privateTeamRoom(createdTeamRoom));
      })
      .catch((err) => {
         if (err instanceof TeamRoomExistsError) {
            res.status(httpStatus.CONFLICT).json({ status: 'EXISTS' });
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
         }
      });
}

export function updateTeamRoom(req, res, next) {
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
         } else if (err instanceof CannotDeactivateError) {
            res.status(httpStatus.CONFLICT).end();
         } else {
            next(new APIError(err, httpStatus.SERVICE_UNAVAILABLE));
         }
      });
}

export function getTeamRoomMembers(req, res, next) {
   const userId = req.user._id;
   const teamRoomId = req.params.teamRoomId;

   teamRoomSvc.getTeamRoomUsers(req, teamRoomId, userId)
      .then((teamRoomUsers) => {
         res.status(httpStatus.OK).json({ teamRoomMembers: publicUsers(teamRoomUsers) });
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
}

export function inviteMembers(req, res, next) {
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
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
         }
      });
}

export function replyToInvite(req, res, next) {
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
}
