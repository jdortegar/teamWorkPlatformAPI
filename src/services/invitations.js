import { sendSubscriberOrgInviteToExternalUser, sendSubscriberOrgInviteToExistingUser, sendTeamInviteToExistingUser, sendTeamRoomInviteToExistingUser } from '../helpers/mailer';
import { userInvited } from './messaging';
import { createRedisRegistration } from './registrations';

export const InvitationKeys = Object.freeze({
   subscriberOrgId: 'subscriberOrgId',
   teamId: 'teamId',
   teamRoomId: 'teamRoomId',
   from(value) { return (this[value]); }
});

const defaultExpiration = 7 * 24 * 60 * 60; // 1 week.

function hashKey(email) {
   return `${email}#pendingInvite`;
}

function toInvitationKey(invitationKey, invitationValue) {
   return `${invitationKey}=${invitationValue}`;
}


export function getRedisInvitations(req, email) {
   return new Promise((resolve, reject) => {
      req.app.locals.redis.hgetallAsync(hashKey(email))
         .then(keyValues => resolve(keyValues))
         .catch(err => reject(err));
   });
}

function createRedisInvitation(req, email, invitationKey, invitationValue, invitation) {
   return new Promise((resolve, reject) => {
      const hash = hashKey(email);
      const key = toInvitationKey(invitationKey, invitationValue);
      req.app.locals.redis.hmsetAsync(hash, key, JSON.stringify(invitation))
         .then(() => req.app.locals.redis.expire(hash, defaultExpiration))
         .then(() => resolve())
         .catch(err => reject(err));
   });
}

export function deleteRedisInvitation(req, email, invitationKey, invitationValue) {
   return new Promise((resolve, reject) => {
      let invitation;
      getRedisInvitations(req, email)
         .then((keyValues) => {
            if (keyValues === null) {
               return undefined;
            }

            const lookForKey = toInvitationKey(invitationKey, invitationValue);
            let val;
            Object.keys(keyValues).forEach((key) => {
               if ((val === undefined) && (key === lookForKey)) {
                  val = keyValues[key];
               }
            });

            if (val) {
               invitation = JSON.parse(val);
               const hash = hashKey(email);
               if (keyValues.length <= 2) {
                  return req.app.locals.redis.delAsync(hash);
               }
               return req.app.locals.redis.hdelAsync(hash, lookForKey);
            }
            return undefined;
         })
         .then(() => resolve(invitation))
         .catch(err => reject(err));
   });
}


export function inviteExistingUsersToSubscriberOrg(req, invitingDbUser, existingDbUsers, subscriberOrg) {
   return new Promise((resolve, reject) => {
      const promises = [];
      const key = toInvitationKey(InvitationKeys.subscriberOrgId, subscriberOrg.subscriberOrgId);
      const invitation = {
         byUserId: invitingDbUser.userId,
         byUserDisplayName: invitingDbUser.userInfo.displayName,
         subscriberOrgId: subscriberOrg.subscriberOrgId,
         subscriberOrgName: subscriberOrg.subscriberOrgInfo.name
      };

      existingDbUsers.forEach((dbUser) => {
         const email = dbUser.userInfo.emailAddress;
         const promise = createRedisInvitation(req, dbUser.userInfo.emailAddress, InvitationKeys.subscriberOrgId, subscriberOrg.subscriberOrgId, invitation)
            .then(() => {
               return Promise.all([
                  sendSubscriberOrgInviteToExistingUser(email, subscriberOrg.subscriberOrgInfo.name, invitingDbUser.userInfo.displayName, key),
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

export function inviteExistingUsersToTeam(req, invitingDbUser, existingDbUsers, subscriberOrg, team) {
   return new Promise((resolve, reject) => {
      const promises = [];
      const key = toInvitationKey(InvitationKeys.teamId, team.teamId);
      const invitation = {
         byUserId: invitingDbUser.userId,
         byUserDisplayName: invitingDbUser.userInfo.displayName,
         subscriberOrgId: team.teamInfo.subscriberOrgId,
         subscriberOrgName: subscriberOrg.subscriberOrgInfo.name,
         teamId: team.teamId,
         teamName: team.teamInfo.name
      };

      existingDbUsers.forEach((dbUser) => {
         const email = dbUser.userInfo.emailAddress;
         const promise = createRedisInvitation(req, dbUser.userInfo.emailAddress, InvitationKeys.teamId, team.teamId, invitation)
            .then(() => {
               return Promise.all([
                  sendTeamInviteToExistingUser(email, subscriberOrg.subscriberOrgInfo.name, team.teamInfo.name, invitingDbUser.userInfo.displayName, key),
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

export function inviteExistingUsersToTeamRoom(req, invitingDbUser, existingDbUsers, subscriberOrg, team, teamRoom) {
   return new Promise((resolve, reject) => {
      const key = toInvitationKey(InvitationKeys.teamRoomId, teamRoom.teamRoomId);
      const invitation = {
         byUserId: invitingDbUser.userId,
         byUserDisplayName: invitingDbUser.userInfo.displayName,
         subscriberOrgId: team.teamInfo.subscriberOrgId,
         subscriberOrgName: subscriberOrg.subscriberOrgInfo.name,
         teamId: team.teamId,
         teamName: team.teamInfo.name,
         teamRoomId: teamRoom.teamRoomId,
         teamRoomName: teamRoom.teamRoomInfo.name
      };

      const promises = [];
      existingDbUsers.forEach((dbUser) => {
         const email = dbUser.userInfo.emailAddress;
         const promise = createRedisInvitation(req, dbUser.userInfo.emailAddress, InvitationKeys.teamRoomId, teamRoom.teamRoomId, invitation)
            .then(() => {
               return Promise.all([
                  sendTeamRoomInviteToExistingUser(email, subscriberOrg.subscriberOrgInfo.name, team.teamInfo.name, teamRoom.teamRoomInfo.name, invitingDbUser.userInfo.displayName, key),
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
      const key = toInvitationKey(InvitationKeys.subscriberOrgId, subscriberOrg.subscriberOrgId);
      const invitation = {
         byUserId: invitingDbUser.userId,
         byUserDisplayName: invitingDbUser.userInfo.displayName,
         subscriberOrgId: subscriberOrg.subscriberOrgId,
         subscriberOrgName: subscriberOrg.subscriberOrgInfo.name
      };

      emails.forEach((email) => {
         const promise = createRedisInvitation(req, email, InvitationKeys.subscriberOrgId, subscriberOrg.subscriberOrgId, invitation)
            .then(() => createRedisRegistration(req, email))
            .then(rid => sendSubscriberOrgInviteToExternalUser(email, subscriberOrg.subscriberOrgInfo.name, invitingDbUser.userInfo.displayName, rid));
         promises.push(promise);
      });
      Promise.all(promises)
         .then(() => resolve())
         .catch(err => reject(err));
   });
}
