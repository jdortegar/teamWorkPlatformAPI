import uuid from 'uuid';
import { sendActivationLink } from '../helpers/mailer';

const defaultExpiration = 30 * 60; // 30 minutes.

export function createRedisRegistration(req, email, expiration = undefined) {
   return new Promise((resolve, reject) => {
      const rid = uuid.v4();
      req.app.locals.redis.set(rid, email, 'EX', expiration || defaultExpiration, (error) => {
         if (error) {
            reject(error);
         } else {
            resolve(rid);
         }
      });
   });
}
