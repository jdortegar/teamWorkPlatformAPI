import config from '../../config/env';

const hashKey = (email) => {
   return `${config.redisPrefix}${email}`;
};

export const createUser = (req, email, userId) => {
   return new Promise((resolve, reject) => {
      req.app.locals.redis.hmsetAsync(hashKey(email), 'userId', userId)
         .then((addUserToCacheResponse) => {
            req.logger.debug(`users-create: created redis hash for email: ${email}`);
            resolve(addUserToCacheResponse);
         })
         .catch((err) => {
            req.logger.debug('users-create: hmset status - redis error');
            reject(err);
         });
   });
};

export const getUserIdByEmail = (req, email) => {
   return new Promise((resolve, reject) => {
      req.app.locals.redis.hmgetAsync(hashKey(email), 'userId')
         .then((response) => {
            if (response.length === 0) {
               resolve();
            }
            const userId = response[0];
            return resolve(userId);
         })
         .catch(err => reject(err));
   });
};
