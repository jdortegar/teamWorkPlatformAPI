import { sendSubscriberOrgInviteToExternalUser, sendSubscriberOrgInviteToExistingUser } from '../helpers/mailer';
import { userInvited } from './messaging';
import { createRedisRegistration } from './registrations';

export const InvitationKeys = Object.freeze({
   subscriberOrgId: 'subscriberOrgId',
   teamId: 'teamId',
   teamRoomId: 'teamRoomId',
   from(value) { return (this[value]); }
});

const defaultExpiration = 7 * 24 * 60 * 60; // 1 week.

function createRedisInvitation(req, email, invitationKey, invitationValue) {
   return new Promise((resolve, reject) => {
      const hash = `habla#pendingInvite#${email}`;
      req.app.locals.redis.hmsetAsync(hash, invitationKey, invitationValue)
         .then(() => req.app.locals.redis.expire(hash, defaultExpiration))
         .then(() => resolve())
         .catch(err => reject(err));
   });
}

function deleteRedisInvitation(req, email) {
   return new Promise((resolve, reject) => {
      const hash = `habla#pendingInvite#${email}`;
      req.app.locals.redis.hmgetAsync(hash, InvitationKeys.subscriberOrgId, InvitationKeys.teamId, InvitationKeys.teamRoomId)
         .then((keyValues) => {
            const subscriberOrgId = keyValues[0];
            const teamId = keyValues[1];
            const teamRoomId = keyValues[2];
            resolve({ subscriberOrgId, teamId, teamRoomId });
         })
         .catch(err => reject(err));
   });
}


export function inviteExistingUsersToSubscriberOrg(req, invitingDbUser, existingDbUsers, subscriberOrg) {
   return new Promise((resolve, reject) => {
      const promises = [];
      existingDbUsers.forEach((dbUser) => {
         const email = dbUser.userInfo.emailAddress;
         const promise = createRedisInvitation(req, dbUser.userInfo.emailAddress, InvitationKeys.subscriberOrgId, subscriberOrg.subscriberOrgId)
            .then(() => createRedisRegistration(req, email))
            .then((rid) => {
               const invitation = {
                  byUserId: invitingDbUser.userId,
                  byUserDisplayName: invitingDbUser.userInfo.displayName,
                  subscriberOrgId: subscriberOrg.subscriberOrgId,
                  subscriberOrgName: subscriberOrg.subscriberOrgInfo.name
               };
               return Promise.all([
                  sendSubscriberOrgInviteToExistingUser(email, subscriberOrg.subscriberOrgInfo.name, invitingDbUser.userInfo.displayName, rid),
                  userInvited(req, dbUser.userId, invitation)
               ]);
            });
         promises.push(promise);
      });
      Promise.all(promises)
         .then(() => resolve())
         .catch(err => reject(err));
   });
}

export function inviteExternalUsersToSubscriberOrg(req, invitingDbUser, emails, subscriberOrg) {
   return new Promise((resolve, reject) => {
      const promises = [];
      emails.forEach((email) => {
         const promise = createRedisInvitation(req, email, InvitationKeys.subscriberOrgId, subscriberOrg.subscriberOrgId)
            .then(() => createRedisRegistration(req, email))
            .then(rid => sendSubscriberOrgInviteToExternalUser(email, subscriberOrg.subscriberOrgInfo.name, invitingDbUser.userInfo.displayName, rid));
         promises.push(promise);
      });
      Promise.all(promises)
         .then(() => resolve())
         .catch(err => reject(err));
   });
}
