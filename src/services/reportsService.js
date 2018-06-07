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

export const lambWestonReportC = (from, until, measure) => {
   const queryString = `SELECT factory as plant, SUM(seconds) as seconds, SUM(minutes) as minutes, SUM(hours) as hours
      FROM public.lamb_weston_raw_data WHERE
      logical_date >= '${from}' AND
      logical_date <= '${until}' AND
      super_reason = 'Uptime'
      GROUP BY plant
      ORDER BY plant
   `;
   return client.query(queryString)
      .then((data) => {
         const dataSet = {
            name: 'Plants',
            colorByPoint: true
         };
         dataSet.data = _.map(data.rows, (row) => {
            return {
               name: row.plant,
               y: row[measure],
            };
         });
         return {
            title: 'Plant Uptime by Week or Month for Multiple Plants Comparison',
            series: [dataSet],
            measure
         };
      });
};

export const lambWestonReportD = (plant, from, until, measure) => {
   const queryString = `SELECT super_reason, SUM(seconds) as seconds, SUM(minutes) as minutes, SUM(hours) as hours
      FROM public.lamb_weston_raw_data WHERE
      LOWER(factory) = LOWER('${plant}') AND
      logical_date >= '${from}' AND
      logical_date <= '${until}' AND
      super_reason <> 'Uptime'
      GROUP BY super_reason
      ORDER BY super_reason
   `;
   return client.query(queryString)
      .then((data) => {
         const dataSet = {
            name: 'Down Time Super Reasons',
            colorByPoint: true
         };
         dataSet.data = _.map(data.rows, (row) => {
            return {
               name: row.super_reason,
               y: row[measure]
            };
         });
         return {
            title: 'Down timme Stopages & Super Reasons',
            series: [dataSet],
            measure,
         };
      });
};

export const lambWestonReportE = (plants, months, measure) => {
   const plantsSentences = _.map(plants, (plant) => {
      return `LOWER(factory) = LOWER('${plant}')`;
   });
   const plantWHERE = `(${plantsSentences.join(' OR ')})`;
   const monthsSentences = _.map(months, (month) => {
      const from = moment(month);
      const until = moment(month).endOf('month');
      return `(logical_date >= '${from.format('YYYY-MM-DD')}' AND logical_date <= '${until.format('YYYY-MM-DD')}')`;
   });
   const monthsWHERE = `(${monthsSentences.join(' OR ')})`;
   const queryString = `SELECT factory as plant, super_reason, DATE_TRUNC('month', logical_date) as month_start, SUM(seconds) as seconds, SUM(minutes) as minutes, SUM(hours) as hours
      FROM public.lamb_weston_raw_data
      WHERE
         super_reason <> 'Uptime' AND
         ${plantWHERE} AND
         ${monthsWHERE}
      GROUP BY plant, super_reason, month_start
      ORDER BY plant
   `;
   return client.query(queryString)
      .then((data) => {
         const categories = _.map(data.rows, (row) => {
            return `${row.plant} ${_.toUpper(moment(row.month_start).format('MMM YYYY'))}`;
         });
         const points = {};
         _.each(data.rows, (row) => {
            const category = `${row.plant} ${_.toUpper(moment(row.month_start).format('MMM YYYY'))}`;
            if (!_.has(points, row.super_reason)) {
               points[row.super_reason] = _.range(0, categories.length, 0);
            }
            const val = row[measure];
            const index = categories.indexOf(category);
            points[row.super_reason][index] = val;
         });
         const series = _.map(points, (values, key) => {
            return {
               name: key,
               data: values
            };
         });
         return {
            title: 'Downtime Comparison Across Multiple Plants by Month',
            categories,
            series,
            measure
         };
      });
};

