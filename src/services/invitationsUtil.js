import moment from 'moment';
import { sendSubscriberOrgInviteToExternalUser, sendSubscriberOrgInviteToExistingUser, sendTeamInviteToExistingUser, sendTeamRoomInviteToExistingUser } from '../helpers/mailer';
import { userInvited } from './messaging/index';
import InvitationKeys from '../repositories/InvitationKeys';
import * as invitationsRepo from '../repositories/invitationsRepo';
import createRegistration from '../repositories/cache/registrationsCache';

const defaultExpirationMinutes = 7 * 24 * 60; // 1 week in minutes.

const toInvitationKey = (invitationKey, invitationValue) => {
   return `${invitationKey}=${invitationValue}`;
};


export const getInvitationsByInviteeEmail = (req, email) => {
   return invitationsRepo.getInvitationsByInviteeEmail(req, email);
};

export const inviteExistingUsersToSubscriberOrg = (req, invitingDbUser, existingDbUsers, subscriberOrg) => {
   return new Promise((resolve, reject) => {
      const promises = [];
      const key = toInvitationKey(InvitationKeys.subscriberOrgId, subscriberOrg.subscriberOrgId);
      const invitation = {
         byUserId: invitingDbUser.userId,
         byUserFirstName: invitingDbUser.userInfo.firstName,
         byUserLastName: invitingDbUser.userInfo.lastName,
         byUserDisplayName: invitingDbUser.userInfo.displayName,
         subscriberOrgId: subscriberOrg.subscriberOrgId,
         subscriberOrgName: subscriberOrg.subscriberOrgInfo.name
      };

      let createdOffset = 0;
      existingDbUsers.forEach((dbUser) => {
         const email = dbUser.userInfo.emailAddress;
         const created = moment(req.now).add(createdOffset, 'milliseconds');
         const promise = invitationsRepo.createInvitation(req, dbUser.userInfo.emailAddress, invitation, created, defaultExpirationMinutes)
            .then(() => {
               return Promise.all([
                  sendSubscriberOrgInviteToExistingUser(email, subscriberOrg.subscriberOrgInfo.name, invitingDbUser.userInfo, key),
                  userInvited(req, dbUser.userId, invitation)
               ]);
            });
         promises.push(promise);
         createdOffset += 1;
      });
      Promise.all(promises)
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

export const inviteExistingUsersToTeam = (req, invitingDbUser, existingDbUsers, subscriberOrg, team) => {
   return new Promise((resolve, reject) => {
      const promises = [];
      const key = toInvitationKey(InvitationKeys.teamId, team.teamId);
      const invitation = {
         byUserId: invitingDbUser.userId,
         byUserFirstName: invitingDbUser.userInfo.firstName,
         byUserLastName: invitingDbUser.userInfo.lastName,
         byUserDisplayName: invitingDbUser.userInfo.displayName,
         subscriberOrgId: team.teamInfo.subscriberOrgId,
         subscriberOrgName: subscriberOrg.subscriberOrgInfo.name,
         teamId: team.teamId,
         teamName: team.teamInfo.name
      };

      let createdOffset = 0;
      existingDbUsers.forEach((dbUser) => {
         const email = dbUser.userInfo.emailAddress;
         const created = moment(req.now).add(createdOffset, 'milliseconds');
         const promise = invitationsRepo.createInvitation(req, dbUser.userInfo.emailAddress, invitation, created, defaultExpirationMinutes)
            .then(() => {
               return Promise.all([
                  sendTeamInviteToExistingUser(email, subscriberOrg.subscriberOrgInfo.name, team.teamInfo.name, invitingDbUser.userInfo, key),
                  userInvited(req, dbUser.userId, invitation)
               ]);
            });
         promises.push(promise);
         createdOffset += 1;
      });
      Promise.all(promises)
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

export const inviteExistingUsersToTeamRoom = (req, invitingDbUser, existingDbUsers, subscriberOrg, team, teamRoom) => {
   return new Promise((resolve) => {
      const key = toInvitationKey(InvitationKeys.teamRoomId, teamRoom.teamRoomId);
      const invitation = {
         byUserId: invitingDbUser.userId,
         byUserFirstName: invitingDbUser.userInfo.firstName,
         byUserLastName: invitingDbUser.userInfo.lastName,
         byUserDisplayName: invitingDbUser.userInfo.displayName,
         subscriberOrgId: team.teamInfo.subscriberOrgId,
         subscriberOrgName: subscriberOrg.subscriberOrgInfo.name,
         teamId: team.teamId,
         teamName: team.teamInfo.name,
         teamRoomId: teamRoom.teamRoomId,
         teamRoomName: teamRoom.teamRoomInfo.name
      };

      const promises = [];
      let createdOffset = 0;
      existingDbUsers.forEach((dbUser) => {
         const email = dbUser.userInfo.emailAddress;
         const created = moment(req.now).add(createdOffset, 'milliseconds');
         const promise = invitationsRepo.createInvitation(req, dbUser.userInfo.emailAddress, invitation, created, defaultExpirationMinutes)
            .then(() => {
               return Promise.all([
                  sendTeamRoomInviteToExistingUser(
                     email,
                     subscriberOrg.subscriberOrgInfo.name,
                     team.teamInfo.name,
                     teamRoom.teamRoomInfo.name,
                     invitingDbUser.userInfo,
                     key
                  ),
                  userInvited(req, dbUser.userId, invitation)
               ]);
            });
         promises.push(promise);
         createdOffset += 1;
      });
      Promise.all(promises)
         .then(() => resolve())
         .catch((err) => {
            // For internal invites, continue without failure since they will get the invite anyway.
            req.error(err);
            resolve();
         });
   });
};

export const inviteExternalUsersToSubscriberOrg = (req, invitingDbUser, emails, subscriberOrg) => {
   return new Promise((resolve, reject) => {
      const promises = [];
      const invitation = {
         byUserId: invitingDbUser.userId,
         byUserFirstName: invitingDbUser.userInfo.firstName,
         byUserLastName: invitingDbUser.userInfo.lastName,
         byUserDisplayName: invitingDbUser.userInfo.displayName,
         subscriberOrgId: subscriberOrg.subscriberOrgId,
         subscriberOrgName: subscriberOrg.subscriberOrgInfo.name
      };

      let createdOffset = 0;
      emails.forEach((email) => {
         const created = moment(req.now).add(createdOffset, 'milliseconds');
         const promise = invitationsRepo.createInvitation(req, email, invitation, created, defaultExpirationMinutes)
            .then(() => createRegistration(req, email, defaultExpirationMinutes))
            .then(rid => sendSubscriberOrgInviteToExternalUser(email, subscriberOrg.subscriberOrgInfo.name, invitingDbUser.userInfo, rid));
         promises.push(promise);
         createdOffset += 1;
      });
      Promise.all(promises)
         .then(() => resolve())
         .catch(err => reject(err));
   });
};
