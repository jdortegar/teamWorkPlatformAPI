import moment from 'moment';
import * as invitationsCache from './cache/invitationsCache';
import * as invitationsTable from './db/invitationsTable';

export const getInvitationsByInviteeEmail = (req, email) => {
   return invitationsCache.getInvitationsByInviteeEmail(req, email);
};

export const createInvitation = (req, email, inviteeUserId = undefined, invitation, created, expirationMinutes) => {
   const expires = moment(created).add(expirationMinutes, 'minutes');
   return Promise.all([
      invitationsCache.createInvitation(req, email, invitation, created, expirationMinutes),
      invitationsTable.createInvitation(req, invitation.byUserId, invitation.byUserFirstName,
         invitation.byUserLastName, invitation.byUserDisplayName, email, inviteeUserId, created, expires,
         {
            subscriberOrgId: invitation.subscriberOrgId,
            subscriberOrgName: invitation.subscriberOrgName,
            teamId: invitation.teamId,
            teamName: invitation.teamName
         }
      )
   ]);
};

export const getInvitationsByInviterUserId = (req, inviterUserId, { since, state }) => {
   return invitationsTable.getInvitationsByInviterUserId(req, inviterUserId, { since, state });
};
