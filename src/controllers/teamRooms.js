import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import { privateTeamRoom, publicTeamRooms, publicUsers } from '../helpers/publishedVisibility';
import teamRoomSvc from '../services/teamRoomService';
import { NoPermissionsError, TeamRoomExistsError, TeamRoomNotExistError } from '../services/errors';

export function getTeamRooms(req, res, next) {
   const userId = req.user._id;
   const { teamId, subscriberOrgId } = req.query;

   teamRoomSvc.getUserTeamRooms(req, userId, { teamId, subscriberOrgId })
      .then((teamRooms) => {
         res.status(httpStatus.OK).json({ teamRooms: publicTeamRooms(teamRooms) });
      })
      .catch((err) => {
         console.error(err);
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
