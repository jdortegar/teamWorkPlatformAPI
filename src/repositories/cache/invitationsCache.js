import _ from 'lodash';
import moment from 'moment';
import config from '../../config/env/index';
import InvitationKeys from '../InvitationKeys';

const hashKey = (email) => {
   return `${config.redisPrefix}${email}#pendingInvites`;
};

/**
 *
 * @param req
 * @param email
 * @returns {Promise}
 */
export const getInvitationsByInviteeEmail = (req, email) => {
   return new Promise((resolve, reject) => {
      const score = req.now.unix();
      req.app.locals.redis.zremrangebyscoreAsync(`${config.redisPrefix}${hashKey(email)}`, 0, score)
         .then(() => req.app.locals.redis.zrangeAsync(`${config.redisPrefix}${hashKey(email)}`, 0, -1))
         .then((invitations) => {
            const invitationsAsObjects = (invitations) ? invitations.map(invitation => JSON.parse(invitation)) : null;
            resolve(invitationsAsObjects);
         })
         .catch(err => reject(err));
   });
};

export const createInvitation = (req, email, invitation, created, expirationMinutes) => {
   return new Promise((resolve, reject) => {
      const invitationWithCreated = _.merge({}, invitation, { created: created.format() });
      const hash = hashKey(email);
      const ttl = moment(created).add(expirationMinutes, 'minutes').unix();
      req.app.locals.redis.zremrangebyscoreAsync(`${config.redisPrefix}${hash}`, 0, req.now.unix())
         .then(() => req.app.locals.redis.zaddAsync(`${config.redisPrefix}${hash}`, ttl, JSON.stringify(invitationWithCreated)))
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

export const deleteInvitation = (req, email, invitationKey, invitationValue) => {
   return new Promise((resolve, reject) => {
      let invitation;
      getInvitationsByInviteeEmail(req, email)
         .then((invitations) => {
            if (invitations === null) {
               return undefined;
            }

            const filteredInvitations = invitations.filter((invite) => {
               let inviteFound = false;
               const inviteValue = invite[invitationKey];
               if ((inviteValue) && (inviteValue === invitationValue)) {
                  switch (invitationKey) {
                     case InvitationKeys.teamRoomId:
                        inviteFound = true;
                        break;
                     case InvitationKeys.teamId:
                        inviteFound = !(invite[InvitationKeys.teamRoomId]);
                        break;
                     case InvitationKeys.subscriberOrgId:
                        inviteFound = !(invite[InvitationKeys.teamId]);
                        break;
                     default:
                  }
               }
               return inviteFound;
            });

            if (filteredInvitations.length > 0) {
               invitation = filteredInvitations[filteredInvitations.length - 1];
               const hash = hashKey(email);
               if (invitations.length === filteredInvitations.length) {
                  return req.app.locals.redis.del(`${config.redisPrefix}${hash}`);
               }

               const promises = [];
               filteredInvitations.forEach((filteredInvitation) => {
                  promises.push(req.app.locals.redis.zremAsync(`${config.redisPrefix}${hash}`, filteredInvitation));
               });
               return Promise.all(promises);
            }

            return undefined;
         })
         .then(() => resolve(invitation))
         .catch(err => reject(err));
   });
};
