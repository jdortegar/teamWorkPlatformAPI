import uuid from 'uuid';
import config from '../../config/env/index';

const defaultExpiration = 30 * 60; // 30 minutes.

const createRegistration = (req, email, expiration = undefined) => {
   return new Promise((resolve, reject) => {
      const rid = uuid.v4();
      req.app.locals.redis.set(`${config.redisPrefix}${rid}`, email, 'EX', expiration || defaultExpiration, (error) => {
         if (error) {
            reject(error);
         } else {
            resolve(rid);
         }
      });
   });
};
export default createRegistration;
