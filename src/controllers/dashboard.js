import httpStatus from 'http-status';
import * as reports from '../services/reportsService';
import { APIError } from '../services/errors';

const getLambWestonReportA = (req, res, next) => {
   const plant = req.query.plant;
   if (!plant) {
      next(new APIError(httpStatus.BAD_REQUEST, "Filter 'plant' is required in Url query."));
   }
   const from = req.query.from;
   const until = req.query.until;
   const measure = req.query.measure || 'minutes';
   reports.lambWestonReportA(plant, from, until, measure)
    .then((reportData) => {
       res.status(httpStatus.OK).json({
          report: reportData
       });
    })
    .catch((err) => {
       next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
    });
};
export default getLambWestonReportA;
