import _ from 'lodash';
import moment from 'moment';
import client from './redshiftClient';

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
               name: key.replace('String ', 'S'),
               data: values
            };
         });
         return {
            title: 'Plant Uptime by Line and String by Time/Date',
            categories,
            series,
            measure
         };
      });
};

export const lambWestonReportB = (plant, month, measure) => {
   const from = moment(month);
   const until = moment(month).endOf('month');
   const queryString = `SELECT asset, logical_date, SUM(seconds) as seconds, SUM(minutes) as minutes,  SUM(hours) as hours 
      FROM public.lamb_weston_raw_data WHERE
      LOWER(factory) = LOWER('${plant}') AND
      logical_date >= '${from.format('YYYY-MM-DD')}' AND
      logical_date <= '${until.format('YYYY-MM-DD')}' AND
      super_reason = 'Uptime'
      GROUP BY asset, logical_date
      ORDER BY asset, logical_date
   `;
   return client.query(queryString)
      .then((data) => {
         const preformatedData = {};
         _.each(data.rows, (row) => {
            if (!_.has(preformatedData, row.asset)) {
               preformatedData[row.asset] = [];
            }
            preformatedData[row.asset].push([moment(row.logical_date).valueOf(), row[measure]]);
         });
         const series = _.map(preformatedData, (points, key) => {
            return {
               name: key.replace('String ', 'S'),
               data: points
            };
         });
         return {
            title: 'Plant Uptime by Month by Line and String by Time/Date',
            series,
            measure
         };
      });
};
