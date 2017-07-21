import moment from 'moment';
import { sendSubscriberOrgInviteToExternalUser, sendSubscriberOrgInviteToExistingUser, sendTeamInviteToExistingUser, sendTeamRoomInviteToExistingUser } from '../helpers/mailer';
import config from '../config/env';
import { userInvited } from './messaging';
import createRedisRegistration from './registrations';

export const InvitationKeys = Object.freeze({
   subscriberOrgId: 'subscriberOrgId',
   teamId: 'teamId',
   teamRoomId: 'teamRoomId',
   from(value) { return (this[value]); }
});

const defaultExpirationMinutes = 7 * 24 * 60; // 1 week in minutes.
// const defaultExpirationOrgInviteMinutes = defaultExpirationMinutes;

function hashKey(email) {
   return `${email}#pendingInvites`;
}

function toInvitationKey(invitationKey, invitationValue) {
   return `${invitationKey}=${invitationValue}`;
}


export function getRedisInvitations(req, email) {
   return new Promise((resolve, reject) => {
      req.app.locals.redis.zremrangebyscoreAsync(`${config.redisPrefix}${hashKey(email)}`, 0, req.now.unix())
         .then(() => {
            return req.app.locals.redis.zrangebyscoreAsync(
               `${config.redisPrefix}${hashKey(email)}`,
               req.now.unix(),
               moment(req.now).add(defaultExpirationMinutes, 'minutes').unix()
            );
         })
         .then((invitations) => {
            const invitationsAsObjects = (invitations) ? invitations.map(invitation => JSON.parse(invitation)) : null;
            resolve(invitationsAsObjects);
         })
         .catch(err => reject(err));
   });
}

function createRedisInvitation(req, email, invitation, expiration) {
   return new Promise((resolve, reject) => {
      const hash = hashKey(email);
      const ttl = req.now.add(expiration, 'minutes').unix();
      req.app.locals.redis.zremrangebyscoreAsync(`${config.redisPrefix}${hash}`, 0, req.now.unix())
         .then(() => req.app.locals.redis.zaddAsync(`${config.redisPrefix}${hash}`, ttl, JSON.stringify(invitation)))
         .then(() => resolve())
         .catch(err => reject(err));
   });
}

export function deleteRedisInvitation(req, email, invitationKey, invitationValue) {
   return new Promise((resolve, reject) => {
      let invitation;
      getRedisInvitations(req, email)
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
               invitation = filteredInvitations[0];
               const hash = hashKey(email);
               if (invitations.length <= 1) {
                  return req.app.locals.redis.del(`${config.redisPrefix}${hash}`);
               }
               return req.app.locals.redis.zremAsync(`${config.redisPrefix}${hash}`, invitation);
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
         const promise = createRedisInvitation(req, dbUser.userInfo.emailAddress, invitation, defaultExpirationMinutes)
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
         const promise = createRedisInvitation(req, dbUser.userInfo.emailAddress, invitation, defaultExpirationMinutes)
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
   return new Promise((resolve) => {
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
         const promise = createRedisInvitation(req, dbUser.userInfo.emailAddress, invitation, defaultExpirationMinutes)
            .then(() => {
               return Promise.all([
                  sendTeamRoomInviteToExistingUser(
                     email,
                     subscriberOrg.subscriberOrgInfo.name,
                     team.teamInfo.name,
                     teamRoom.teamRoomInfo.name,
                     invitingDbUser.userInfo.displayName,
                     key
                  ),
                  userInvited(req, dbUser.userId, invitation)
               ]);
            });
         promises.push(promise);
      });
      Promise.all(promises)
         .then(() => resolve())
         .catch((err) => {
            // For internal invites, continue without failure since they will get the invite anyway.
            req.error(err);
            resolve();
         });
   });
}

export function inviteExternalUsersToSubscriberOrg(req, invitingDbUser, emails, subscriberOrg) {
   return new Promise((resolve, reject) => {
      const promises = [];
      const invitation = {
         byUserId: invitingDbUser.userId,
         byUserDisplayName: invitingDbUser.userInfo.displayName,
         subscriberOrgId: subscriberOrg.subscriberOrgId,
         subscriberOrgName: subscriberOrg.subscriberOrgInfo.name
      };

      emails.forEach((email) => {
         const promise = createRedisInvitation(req, email, invitation, defaultExpirationMinutes, 'minutes')
            .then(() => createRedisRegistration(req, email, defaultExpirationMinutes))
            .then(rid => sendSubscriberOrgInviteToExternalUser(email, subscriberOrg.subscriberOrgInfo.name, invitingDbUser.userInfo.displayName, rid));
         promises.push(promise);
      });
      Promise.all(promises)
         .then(() => resolve())
         .catch(err => reject(err));
   });
}
