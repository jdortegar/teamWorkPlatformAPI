import {
   privateSubscriberOrg,
   privateTeam,
   privateTeamRoom,
   privateUser,
   publicConversation,
   publicTeam,
   publicTeamRoom,
   publicUser,
   publicMessage,
   publicSubscriberOrg
} from '../../helpers/publishedVisibility';
import { _broadcastEvent, _joinChannels, _presenceChanged, ChannelFactory, EventTypes } from './messagingService';

// EventType = presence

export function presenceChanged(req, userId, presenceStatus, presenceMessage = undefined) {
   return _presenceChanged(req, EventTypes.presenceChanged, { userId, presenceStatus, presenceMessage });
}


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
   return _broadcastEvent(req, EventTypes.userInvited, privateSubscriberOrg(subscriberOrg), [
      ChannelFactory.subscriberOrgAdminChannel(subscriberOrg.subscriberOrgId)
   ]);
}

export function userInvited(req, userId, invitation) {
   return _broadcastEvent(req, userId, invitation, [
      ChannelFactory.personalChannel(userId)
   ]);
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
