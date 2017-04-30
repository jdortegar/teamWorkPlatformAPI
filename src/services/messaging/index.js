import { privateSubscriberOrg, privateUser, publicUser, publicMessage, publicSubscriberOrg } from '../../helpers/publishedVisibility';
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
   return _broadcastEvent(req, EventTypes.subscriberOrgPrivateInfoUpdated, privateSubscriberOrg(subscriberOrg), [
      ChannelFactory.subscriberOrgAdminChannel(subscriberOrg.subscriberOrgId)
   ]);
}


// EventType = message

export function messageCreated(req, message) {
   return _broadcastEvent(req, EventTypes.messageCreated, publicMessage(message), [
      ChannelFactory.conversationChannel(message.conversationId)
   ]);
}
