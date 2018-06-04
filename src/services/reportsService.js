import _ from 'lodash';
import moment from 'moment';
import client from './redshiftClient';

function getFormatedAssetName(asset) {
   switch (asset) {
      case 'L1 String 10':
         return 'L1 S10';
      case 'L1 String 6':
         return 'L1 S6';
      case 'L1 String 7':
         return 'L1 S7';
      case 'L1 String 8':
         return 'L1 S9';
      case 'L2 String 1':
         return 'L2 S1';
      case 'L2 String 2':
         return 'L2 S2';
      case 'L2 String 3':
         return 'L2 S3';
      case 'L2 String 4':
         return 'L2 S4';
      case 'L2 String 5':
         return 'L2 S5';
      default:
         return asset;
   }
}

// Disable this until add other reports
/* eslint import/prefer-default-export: "off" */
export const lambWestonReportA = (plant, from, until, measure) => {
   const momentFrom = moment(from);
   const momentUntil = moment(until);
   const days = moment.duration(momentUntil.diff(momentFrom)).asDays() + 1;

   const querystring = `SELECT id, asset, logical_date, seconds, minutes, hours 
      FROM public.lamb_weston_raw_data WHERE
      LOWER(factory) = LOWER('${plant}') AND
      logical_date >= '${from}' AND
      logical_date <= '${until}' AND
      super_reason = 'Uptime'
      ORDER BY asset, logical_date
   `;

   return client.query(querystring, [plant, from, until])
      .then((data) => {
         const categories = [];
         const points = {};
         _.each(data.rows, (metric) => {
            const formatedDate = moment(metric.logical_date).format('MM/DD/YYYY');
            if (categories.indexOf(formatedDate) < 0) {
               categories.push(formatedDate);
            }
            if (!_.has(points, metric.asset)) {
               points[metric.asset] = _.range(0, days, 0);
            }
            const val = metric[measure];
            const index = categories.indexOf(formatedDate);
            points[metric.asset][index] += val;
         });
         const series = _.map(points, (values, key) => {
            return {
               name: getFormatedAssetName(key),
               data: values
            };
         });
         return {
            categories,
            series,
            measure
         };
      });
};

