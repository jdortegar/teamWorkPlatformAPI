import uuid from 'uuid';
import { sendActivationLink } from '../helpers/mailer';

export function createRedisRegistration(req, email) {
   return new Promise((resolve, reject) => {
      const rid = uuid.v4();
      req.app.locals.redis.set(rid, email, 'EX', 1800, (error) => {
         if (error) {
            reject(error);
         } else {
            resolve(rid);
         }
      });
   });
}
