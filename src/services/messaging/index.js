import _ from 'lodash';
import { apiVersionedVisibility, publishByApiVersion } from '../../helpers/publishedVisibility';
import * as internalQueue from './internalQueue';
import { _broadcastEvent, _joinChannels, ChannelFactory, EventTypes } from './messagingService';
import Roles from '../roles';

// EventType = user

export const userCreated = (req, user) => { // eslint-disable-line no-unused-vars
   // No need to broadcast this, since the user is by themselves at this point, and not logged-in.
   // return _broadcastEvent(req, EventTypes.userCreated, publicUser(user), [
   //    ChannelFactory.publicChannel()
   // ]);
};

export const userUpdated = (req, user) => {
   // TODO: should only be broadcast to subscribersOrgs of the user.
   return _broadcastEvent(req, EventTypes.userUpdated, publishByApiVersion(req, apiVersionedVisibility.publicUser, user), [
      ChannelFactory.publicChannel()
   ]);
};

export const userPrivateInfoUpdated = (req, user) => {
   return _broadcastEvent(req, EventTypes.userPrivateInfoUpdated, publishByApiVersion(req, apiVersionedVisibility.privateUser, user), [
      ChannelFactory.personalChannel(user.userId)
   ]);
};

export const userInvited = (req, userId, invitation) => {
   return _broadcastEvent(req, EventTypes.userInvited, invitation, [
      ChannelFactory.personalChannel(userId)
   ]);
};

export const userInvitationDeclined = (req, userId, invitation) => {
   return _broadcastEvent(req, EventTypes.userInvitationDeclined, invitation, [
      ChannelFactory.personalChannel(userId)
   ]);
};


// EventType = subscriberOrg

export const subscriberOrgCreated = (req, subscriberOrg, userId) => {
   _joinChannels(req, userId, [
      ChannelFactory.subscriberOrgChannel(subscriberOrg.subscriberOrgId),
      ChannelFactory.subscriberOrgAdminChannel(subscriberOrg.subscriberOrgId)
   ]);

   // Only the person who created this gets to know, as she's the only person in that org.
   return _broadcastEvent(req, EventTypes.subscriberOrgCreated, publishByApiVersion(req, apiVersionedVisibility.publicSubscriberOrg, subscriberOrg), [
      ChannelFactory.personalChannel(userId)
   ]);
};

export const subscriberOrgUpdated = (req, subscriberOrg) => {
   return _broadcastEvent(req, EventTypes.subscriberOrgUpdated, publishByApiVersion(req, apiVersionedVisibility.publicSubscriberOrg, subscriberOrg), [
      ChannelFactory.subscriberOrgChannel(subscriberOrg.subscriberOrgId)
   ]);
};

export const subscriberOrgPrivateInfoUpdated = (req, subscriberOrg) => {
   return _broadcastEvent(req, EventTypes.userPrivateInfoUpdated, publishByApiVersion(req, apiVersionedVisibility.privateSubscriberOrg, subscriberOrg), [
      ChannelFactory.subscriberOrgAdminChannel(subscriberOrg.subscriberOrgId)
   ]);
};

export const subscriberAdded = (req, subscriberOrgId, user, role, subscriberUserId) => {
   const subscriberOrgChannel = ChannelFactory.subscriberOrgChannel(subscriberOrgId);
   const channels = [ChannelFactory.subscriberOrgChannel(subscriberOrgId)];
   if (role === Roles.admin) {
      channels.push(ChannelFactory.subscriberOrgAdminChannel(subscriberOrgId));
   }

   return _joinChannels(req, user.userId, channels)
      .then(() => {
         const mergedUser = _.merge(user.userInfo, { userId: user.userId, role, subscriberUserId });
         _broadcastEvent(req, EventTypes.subscriberAdded, publishByApiVersion(req, apiVersionedVisibility.publicSubscriber, subscriberOrgId, mergedUser), [subscriberOrgChannel]);
      })
      .catch(err => req.logger.error(err));
};


// EventType = team

export const teamCreated = (req, team, userId) => {
   _joinChannels(req, userId, [
      ChannelFactory.teamChannel(team.teamId),
      ChannelFactory.teamAdminChannel(team.teamId)
   ]);

   return _broadcastEvent(req, EventTypes.teamCreated, publishByApiVersion(req, apiVersionedVisibility.publicTeam, team), [
      ChannelFactory.subscriberOrgChannel(team.subscriberOrgId)
   ]);
};

export const teamUpdated = (req, team) => {
   return _broadcastEvent(req, EventTypes.teamUpdated, publishByApiVersion(req, apiVersionedVisibility.publicTeam, team), [
      ChannelFactory.teamChannel(team.teamId)
   ]);
};

export const teamPrivateInfoUpdated = (req, team) => {
   return _broadcastEvent(req, EventTypes.teamPrivateInfoUpdated, publishByApiVersion(req, apiVersionedVisibility.privateTeam, team), [
      ChannelFactory.teamAdminChannel(team.teamId)
   ]);
};

export const teamMemberAdded = (req, teamId, user, role, teamMemberId) => {
   const teamChannel = ChannelFactory.teamChannel(teamId);
   const channels = [teamChannel];
   if (role === Roles.admin) {
      channels.push(ChannelFactory.teamAdminChannel(teamId));
   }

   return _joinChannels(req, user.userId, channels)
      .then(() => {
         const mergedUser = _.merge(user.userInfo, { user: user.userId, role, teamMemberId });
         _broadcastEvent(req, EventTypes.teamMemberAdded, publishByApiVersion(req, apiVersionedVisibility.publicTeamMember, teamId, mergedUser), [teamChannel]);
      })
      .catch(err => req.logger.error(err));
};


// EventType = teamRoom

export const teamRoomCreated = (req, teamRoom, userId) => {
   _joinChannels(req, userId, [
      ChannelFactory.teamRoomChannel(teamRoom.teamRoomId),
      ChannelFactory.teamRoomAdminChannel(teamRoom.teamRoomId)
   ]);

   return _broadcastEvent(req, EventTypes.teamRoomCreated, publishByApiVersion(req, apiVersionedVisibility.publicTeamRoom, teamRoom), [
      ChannelFactory.teamChannel(teamRoom.teamId)
   ]);
};

export const teamRoomUpdated = (req, teamRoom) => {
   return _broadcastEvent(req, EventTypes.teamRoomUpdated, publishByApiVersion(req, apiVersionedVisibility.publicTeamRoom, teamRoom), [
      ChannelFactory.teamRoomChannel(teamRoom.teamRoomId)
   ]);
};

export const teamRoomPrivateInfoUpdated = (req, teamRoom) => {
   return _broadcastEvent(req, EventTypes.teamRoomPrivateInfoUpdated, publishByApiVersion(req, apiVersionedVisibility.privateTeamRoom, teamRoom), [
      ChannelFactory.teamRoomAdminChannel(teamRoom.teamRoomId)
   ]);
};

export const teamRoomMemberAdded = (req, teamRoomId, user, role, teamRoomMemberId) => {
   const teamRoomChannel = ChannelFactory.teamRoomChannel(teamRoomId);
   const channels = [teamRoomChannel];
   if (role === Roles.admin) {
      channels.push(ChannelFactory.teamRoomAdminChannel(teamRoomId));
   }

   return _joinChannels(req, user.userId, channels)
      .then(() => {
         const mergedUser = _.merge(user.userInfo, { userId: user.userId, role, teamRoomMemberId });
         _broadcastEvent(req, EventTypes.teamRoomMemberAdded, publishByApiVersion(req, apiVersionedVisibility.publicTeamRoomMember, teamRoomId, mergedUser), [teamRoomChannel]);
      })
      .catch(err => req.logger.error(err));
};


// EventType = conversation

export const conversationCreated = (req, conversation, userId) => {
   _joinChannels(req, userId, [
      ChannelFactory.conversationChannel(conversation.conversationId)
   ]);

   return _broadcastEvent(req, EventTypes.conversationCreated, publishByApiVersion(req, apiVersionedVisibility.publicConversation, conversation), [
      ChannelFactory.teamRoomChannel(conversation.teamRoomId)
   ]);
};

export const conversationUpdated = (req, conversation) => {
   return _broadcastEvent(req, EventTypes.conversationUpdated, publishByApiVersion(req, apiVersionedVisibility.publicConversation, conversation), [
      ChannelFactory.conversationChannel(conversation.conversationId)
   ]);
};


// EventType = message

export const messageCreated = (req, message) => {
   return _broadcastEvent(req, EventTypes.messageCreated, publishByApiVersion(req, apiVersionedVisibility.publicMessage, message), [
      ChannelFactory.conversationChannel(message.conversationId)
   ]);
};


// EventType = integration

export const integrationsUpdated = (req, subscriberUser) => {
   // Send to internal channel.
   const event = _.cloneDeep(subscriberUser);
   delete event.role;
   internalQueue.sendEvent(req, EventTypes.integrationsUpdated, event);

   return _broadcastEvent(req, EventTypes.integrationsUpdated, publishByApiVersion(req, apiVersionedVisibility.publicIntegration, subscriberUser), [
      ChannelFactory.personalChannel(subscriberUser.userId)
   ]);
};

export const boxWebhookEvent = (req, body) => {
   // Send to internal channel.
   internalQueue.sendEvent(req, EventTypes.boxWebhookEvent, body);
};

export const googleWebhookEvent = (req, body) => {
   // Send to internal channel.
   internalQueue.sendEvent(req, EventTypes.googleWebhookEvent, body);
};

