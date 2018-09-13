import moment from 'moment';
import { sendSubscriberOrgInviteToExternalUser, sendSubscriberOrgInviteToExistingUser, sendTeamInviteToExistingUser, sendTeamRoomInviteToExistingUser } from '../helpers/mailer';
import { userInvited, sentInvitationStatus } from './messaging/index';
import InvitationKeys from '../repositories/InvitationKeys';
import * as invitationsRepo from '../repositories/invitationsRepo';
import createRegistration from '../repositories/cache/registrationsCache';

const defaultExpirationMinutes = 7 * 24 * 60; // 1 week in minutes.

const toInvitationKey = (invitationKey, invitationValue) => {
   return `${invitationKey}=${invitationValue}`;
};


export const inviteExistingUsersToSubscriberOrg = (req, invitingDbUser, existingDbUsers, subscriberOrg) => {
   if (existingDbUsers.length === 0) {
      return Promise.resolve();
   }

   return new Promise((resolve, reject) => {
      const promises = [];
      const key = toInvitationKey(InvitationKeys.subscriberOrgId, subscriberOrg.subscriberOrgId);
      const invitation = {
         byUserId: invitingDbUser.userId,
         byUserFirstName: invitingDbUser.firstName,
         byUserLastName: invitingDbUser.lastName,
         byUserDisplayName: invitingDbUser.displayName,
         subscriberOrgId: subscriberOrg.subscriberOrgId,
         subscriberOrgName: subscriberOrg.name,
         created: req.now.format()
      };

      let createdOffset = 0;
      existingDbUsers.forEach((dbUser) => {
         const email = dbUser.emailAddress;
         const created = moment(req.now).add(createdOffset, 'milliseconds');
         const promise = invitationsRepo.createInvitation(req, dbUser.emailAddress, dbUser.userId, invitation, created, defaultExpirationMinutes)
            .then((createdInvitations) => {
               const dbinvitation = createdInvitations[1];
               return Promise.all([
                  sendSubscriberOrgInviteToExistingUser(email, subscriberOrg.name, invitingDbUser, dbUser, key),
                  userInvited(req, dbUser.userId, invitation),
                  sentInvitationStatus(req, dbinvitation)
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
         byUserFirstName: invitingDbUser.firstName,
         byUserLastName: invitingDbUser.lastName,
         byUserDisplayName: invitingDbUser.displayName,
         subscriberOrgId: team.subscriberOrgId,
         subscriberOrgName: subscriberOrg.name,
         teamId: team.teamId,
         teamName: team.name,
         created: req.now.format()
      };

      let createdOffset = 0;
      existingDbUsers.forEach((dbUser) => {
         const email = dbUser.emailAddress;
         const created = moment(req.now).add(createdOffset, 'milliseconds');
         const promise = invitationsRepo.createInvitation(req, dbUser.emailAddress, dbUser.userId, invitation, created, defaultExpirationMinutes)
            .then((createdInvitations) => {
               const dbinvitation = createdInvitations[1];
               return Promise.all([
                  sendTeamInviteToExistingUser(email, subscriberOrg.name, team.name, invitingDbUser, dbUser, key),
                  userInvited(req, dbUser.userId, invitation),
                  sentInvitationStatus(req, dbinvitation)
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

export const inviteExternalUsersToSubscriberOrg = (req, invitingDbUser, emails, subscriberOrg) => {
   if (emails.size === 0) {
      return Promise.resolve();
   }

   return new Promise((resolve, reject) => {
      const promises = [];
      const invitation = {
         byUserId: invitingDbUser.userId,
         byUserFirstName: invitingDbUser.firstName,
         byUserLastName: invitingDbUser.lastName,
         byUserDisplayName: invitingDbUser.displayName,
         subscriberOrgId: subscriberOrg.subscriberOrgId,
         subscriberOrgName: subscriberOrg.name,
         created: req.now.format()
      };

      let createdOffset = 0;
      emails.forEach((email) => {
         const created = moment(req.now).add(createdOffset, 'milliseconds');
         const promise = invitationsRepo.createInvitation(req, email, undefined, invitation, created, defaultExpirationMinutes)
            .then((createdInvitations) => {
               const dbinvitation = createdInvitations[1];
               sentInvitationStatus(req, dbinvitation);
               return createRegistration(req, email, defaultExpirationMinutes);
            })
            .then(rid => sendSubscriberOrgInviteToExternalUser(email, subscriberOrg.name, invitingDbUser, rid));
         promises.push(promise);
         createdOffset += 1;
      });
      Promise.all(promises)
         .then(() => resolve())
         .catch(err => reject(err));
   });
};
