import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import teamRoomSvc from '../services/teamRoomService';

export function getTeamRooms(req, res, next) {
   const userId = req.user._id;

   teamRoomSvc.getUserTeamRooms(req, userId)
      .then((teamRooms) => {
         res.status(httpStatus.OK).json({ teamRooms: teamRooms });
      })
      .catch((err) => {
         console.error(err);
         return next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
      });
}
