import moment from 'moment';
import _ from 'lodash';

const defaultExpirationMinutes = 7 * 24 * 60; // 1 week in minutes.

function hashKey(userId) {
   return `${userId}#presence`;
}

export function getPresence(req, userId) {
   return new Promise((resolve, reject) => {
      req.app.locals.redis.zremrangebyscoreAsync(hashKey(userId), 0, req.now.unix())
         .then(() => req.app.locals.redis.zrangebyscoreAsync(hashKey(userId), req.now.unix(), moment(req.now).add(defaultExpirationMinutes, 'minutes').unix()))
         .then((presenceAsStrings) => {
            const presences = [];
            presenceAsStrings.forEach((presenceAsString) => { presences.push(JSON.parse(presenceAsString)); });
            resolve(presences);
         })
         .catch(err => reject(err));
   });
}

export function setPresence(req, userId, presence) {
   return new Promise((resolve, reject) => {
      const hash = hashKey(userId);
      const ttl = req.now.add(defaultExpirationMinutes, 'minutes').unix();
      let previousLocation;
      getPresence(req, userId)
         .then((presences) => {
            const foundPresences = presences.filter((pres) => {
               const presAddress = pres.address;
               const presUserAgent = pres.userAgent;
               return ((presAddress === presence.address) && (presUserAgent === presence.userAgent));
            });

            // Should be at most 1 presence for address/userAgent combo.
            if (foundPresences.length > 0) {
               previousLocation = foundPresences[0].location;
               return req.app.locals.redis.zremAsync(hash, foundPresences[0]);
            }
            return undefined;
         })
         .then(() => {
            const cachePresence = _.cloneDeep(presence);
            cachePresence.location = cachePresence.location || previousLocation;
            req.app.locals.redis.zaddAsync(hash, ttl, JSON.stringify(cachePresence));
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
}
