import _ from 'lodash';
import {
   privateSubscriberOrg,
   privateTeam,
   privateTeamRoom,
   privateUser,
   publicConversation,
   publicIntegration,
   publicTeam,
   publicTeamMember,
   publicTeamRoom,
   publicTeamRoomMember,
   publicUser,
   publicMessage,
   publicSubscriber,
   publicSubscriberOrg
} from '../../helpers/publishedVisibility';
import * as internalQueue from './internalQueue';
import { _broadcastEvent, _joinChannels, ChannelFactory, EventTypes } from './messagingService';
import Roles from '../roles';

// EventType = presence

// export function presenceChanged(req, userId, presenceStatus, presenceMessage = undefined) {
//    // TODO: presence only for orgs of user.
//    // TODO: get address, userAgent, location
//    return _presenceChanged(req, EventTypes.presenceChanged, userId, address, userAgent, location, presenceStatus, presenceMessage });
// }


// EventType = user

export function userCreated(req, user) {
   return _broadcastEvent(req, EventTypes.userCreated, publicUser(user), [
      ChannelFactory.publicChannel()
   ]);
}

export function userUpdated(req, user) {
   return _broadcastEvent(req, EventTypes.userUpdated, publicUser(user), [
      ChannelFactory.publicChannel()
   ]);
}

export function userPrivateInfoUpdated(req, user) {
   return _broadcastEvent(req, EventTypes.userPrivateInfoUpdated, privateUser(user), [
      ChannelFactory.personalChannel(user.userId)
   ]);
}

export function userInvited(req, userId, invitation) {
   return _broadcastEvent(req, EventTypes.userInvited, invitation, [
      ChannelFactory.personalChannel(userId)
   ]);
}


// EventType = subscriberOrg

export function subscriberOrgCreated(req, subscriberOrg, userId) {
   _joinChannels(req, userId, [
      ChannelFactory.subscriberOrgChannel(subscriberOrg.subscriberOrgId),
      ChannelFactory.subscriberOrgAdminChannel(subscriberOrg.subscriberOrgId)
   ]);

   return _broadcastEvent(req, EventTypes.subscriberOrgCreated, publicSubscriberOrg(subscriberOrg), [
      ChannelFactory.publicChannel()
   ]); // TODO: which channels gets this.
}

export function subscriberOrgUpdated(req, subscriberOrg) {
   return _broadcastEvent(req, EventTypes.subscriberOrgUpdated, publicSubscriberOrg(subscriberOrg), [
      ChannelFactory.subscriberOrgChannel(subscriberOrg.subscriberOrgId)
   ]);
}

export function subscriberOrgPrivateInfoUpdated(req, subscriberOrg) {
   return _broadcastEvent(req, EventTypes.userPrivateInfoUpdated, privateSubscriberOrg(subscriberOrg), [
      ChannelFactory.subscriberOrgAdminChannel(subscriberOrg.subscriberOrgId)
   ]);
}

export function subscriberAdded(req, subscriberOrgId, user, role = Roles.user) {
   const subscriberOrgChannel = ChannelFactory.subscriberOrgChannel(subscriberOrgId);
   const channels = [ChannelFactory.subscriberOrgChannel(subscriberOrgId)];
   if (role === Roles.admin) {
      channels.push(ChannelFactory.subscriberOrgAdminChannel(subscriberOrgId));
   }

   return _joinChannels(req, user.userId, channels)
      .then(() => _broadcastEvent(req, EventTypes.subscriberAdded, publicSubscriber(subscriberOrgId, user), [subscriberOrgChannel]))
      .catch(err => req.logger.error(err));
}


// EventType = team

export function teamCreated(req, team, userId) {
   _joinChannels(req, userId, [
      ChannelFactory.teamChannel(team.teamId),
      ChannelFactory.teamAdminChannel(team.teamId)
   ]);

   return _broadcastEvent(req, EventTypes.teamCreated, publicTeam(team), [
      ChannelFactory.subscriberOrgChannel(team.subscriberOrgId)
   ]);
}

export function teamUpdated(req, team) {
   return _broadcastEvent(req, EventTypes.teamUpdated, publicTeam(team), [
      ChannelFactory.teamChannel(team.teamId)
   ]);
}

export function teamPrivateInfoUpdated(req, team) {
   return _broadcastEvent(req, EventTypes.teamPrivateInfoUpdated, privateTeam(team), [
      ChannelFactory.teamAdminChannel(team.teamId)
   ]);
}

export function teamMemberAdded(req, teamId, user, role = Roles.user) {
   const teamChannel = ChannelFactory.teamChannel(teamId);
   const channels = [teamChannel];
   if (role === Roles.admin) {
      channels.push(ChannelFactory.teamAdminChannel(teamId));
   }

   return _joinChannels(req, user.userId, channels)
      .then(() => _broadcastEvent(req, EventTypes.teamMemberAdded, publicTeamMember(teamId, user), [teamChannel]))
      .catch(err => req.logger.error(err));
}


// EventType = teamRoom

export function teamRoomCreated(req, teamRoom, userId) {
   _joinChannels(req, userId, [
      ChannelFactory.teamRoomChannel(teamRoom.teamRoomId),
      ChannelFactory.teamRoomAdminChannel(teamRoom.teamRoomId)
   ]);

   return _broadcastEvent(req, EventTypes.teamRoomCreated, publicTeamRoom(teamRoom), [
      ChannelFactory.teamChannel(teamRoom.teamId)
   ]);
}

export function teamRoomUpdated(req, teamRoom) {
   return _broadcastEvent(req, EventTypes.teamRoomUpdated, publicTeamRoom(teamRoom), [
      ChannelFactory.teamRoomChannel(teamRoom.teamRoomId)
   ]);
}

export function teamRoomPrivateInfoUpdated(req, teamRoom) {
   return _broadcastEvent(req, EventTypes.teamRoomPrivateInfoUpdated, privateTeamRoom(teamRoom), [
      ChannelFactory.teamRoomAdminChannel(teamRoom.teamRoomId)
   ]);
}

export function teamRoomMemberAdded(req, teamRoomId, user, role = Roles.user) {
   const teamRoomChannel = ChannelFactory.teamRoomChannel(teamRoomId);
   const channels = [teamRoomChannel];
   if (role === Roles.admin) {
      channels.push(ChannelFactory.teamRoomAdminChannel(teamRoomId));
   }

   return _joinChannels(req, user.userId, channels)
      .then(() => _broadcastEvent(req, EventTypes.teamRoomMemberAdded, publicTeamRoomMember(teamRoomId, user), [teamRoomChannel]))
      .catch(err => req.logger.error(err));
}


// EventType = conversation

export function conversationCreated(req, conversation, userId) {
   _joinChannels(req, userId, [
      ChannelFactory.conversationChannel(conversation.conversationId)
   ]);

   return _broadcastEvent(req, EventTypes.conversationCreated, publicConversation(conversation), [
      ChannelFactory.teamRoomChannel(conversation.teamRoomId)
   ]);
}

export function conversationUpdated(req, conversation) {
   return _broadcastEvent(req, EventTypes.conversationUpdated, publicConversation(conversation), [
      ChannelFactory.conversationChannel(conversation.conversationId)
   ]);
}


// EventType = message

export function messageCreated(req, message) {
   return _broadcastEvent(req, EventTypes.messageCreated, publicMessage(message), [
      ChannelFactory.conversationChannel(message.conversationId)
   ]);
}


// EventType = integration

export function boxIntegrationCreated(req, subscriberUser) {
   // Send to internal channel.
   const event = _.cloneDeep(subscriberUser);
   delete event.role;
   internalQueue.sendEvent(req, EventTypes.boxIntegrationCreated, event);

   return _broadcastEvent(req, EventTypes.boxIntegrationCreated, publicIntegration(subscriberUser), [
      ChannelFactory.personalChannel(subscriberUser.userId)
   ]);
}

export function boxIntegrationExpired(req, subscriberUser) {
   return _broadcastEvent(req, EventTypes.boxIntegrationExpired, publicIntegration(subscriberUser), [
      ChannelFactory.personalChannel(subscriberUser.userId)
   ]);
}

export function boxWebhookEvent(req, body) {
   // Send to internal channel.
   internalQueue.sendEvent(req, EventTypes.boxWebhookEvent, body);
}

export function googleIntegrationCreated(req, subscriberUser) {
   // Send to internal channel.
   const event = _.cloneDeep(subscriberUser);
   delete event.role;
   internalQueue.sendEvent(req, EventTypes.googleIntegrationCreated, event);

   return _broadcastEvent(req, EventTypes.googleIntegrationCreated, publicIntegration(subscriberUser), [
      ChannelFactory.personalChannel(subscriberUser.userId)
   ]);
}

export function googleIntegrationExpired(req, subscriberUser) {
   return _broadcastEvent(req, EventTypes.googleIntegrationExpired, publicIntegration(subscriberUser), [
      ChannelFactory.personalChannel(subscriberUser.userId)
   ]);
}

export function googleWebhookEvent(req, body) {
   // Send to internal channel.
   internalQueue.sendEvent(req, EventTypes.googleWebhookEvent, body);
}
