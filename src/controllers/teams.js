import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import teamSvc from '../services/teamService';

export function getTeams(req, res, next) {
   const userId = 'ea794510-cea6-4132-ae22-a7ae1d32abb5'; // TODO:

   teamSvc.getUserTeams(req, userId)
      .then((teams) => {
         res.status(httpStatus.OK).json({ teams: teams });
      })
      .catch((err) => {
         console.error(err);
         return next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
      });
}
