import httpStatus from 'http-status';
import * as reports from '../services/reportsService';
import { APIError } from '../services/errors';

export const getLambWestonReportA = (req, res, next) => {
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

export const getLambWestonReportB = (req, res, next) => {
   const plant = req.query.plant;
   if (!plant) {
      next(new APIError(httpStatus.BAD_REQUEST, "Filter 'plant' is required"));
   }
   const month = req.query.month;
   if (!month) {
      next(new APIError(httpStatus.BAD_REQUEST, "Filter 'month' is required"));
   }
   const measure = req.query.measure || 'minutes';
   reports.lambWestonReportB(plant, month, measure)
      .then((reportData) => {
         res.status(httpStatus.OK).json({
            report: reportData
         });
      })
      .catch((err) => {
         next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
      });
};

