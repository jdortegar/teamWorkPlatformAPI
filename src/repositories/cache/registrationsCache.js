import uuid from 'uuid';
import moment from 'moment';
import config from '../../config/env/index';

const defaultExpiration = 30 * 60; // 30 minutes.

const createRegistration = (req, email, subscriberOrgName, expiration = undefined) => {
   return new Promise((resolve, reject) => {
      const rid = uuid.v4();
      const confirmationCode = String(moment().valueOf()).slice(-6);
      req.app.locals.redis.hmset(`${config.redisPrefix}#registration#${rid}`, 'email', email, 'subscriberOrgName', subscriberOrgName, 'confirmationCode', confirmationCode, 'EX', expiration || defaultExpiration, (error) => {
         if (error) {
            reject(error);
         } else {
            resolve({ rid, confirmationCode });
         }
      });
   });
};
export default createRegistration;
