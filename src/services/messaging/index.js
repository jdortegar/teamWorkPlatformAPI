import { publicUser, publicMessage, publicSubscriberOrg } from '../../helpers/publishedVisibility';
import messagingSvc, { ChannelFactory, EventTypes } from './messagingService';


// EventType = presence

export function presenceChanged(req, userId, presenceStatus, presenceMessage = undefined) {
   return messagingSvc._presenceChanged(req, EventTypes.presenceChanged, { userId, presenceStatus, presenceMessage });
}


// EventType = user

export function userCreated(req, user) {
   return messagingSvc.broadcastEvent(req, EventTypes.userCreated, publicUser(user), [
      ChannelFactory.publicChannel()
   ]);
}

export function userUpdated(req, user) {
   return messagingSvc.broadcastEvent(req, EventTypes.userUpdated, publicUser(user), [
      ChannelFactory.publicChannel()
   ]);
}


// EventType = subscriberOrg

export function subscriberOrgCreated(req, subscriberOrg) {
   return messagingSvc.broadcastEvent(req, EventTypes.subscriberOrgCreated, publicSubscriberOrg(subscriberOrg), [
      ChannelFactory.publicChannel()
   ]); // TODO: which channels gets this.
}

export function subscriberOrgUpdated(req, subscriberOrg) {
   return messagingSvc.broadcastEvent(req, EventTypes.subscriberOrgUpdated, publicSubscriberOrg(subscriberOrg), [
      ChannelFactory.subscriberOrgChannel(subscriberOrg.subscriberOrgId)
   ]);
}


// EventType = message

export function messageCreated(req, message) {
   return messagingSvc.broadcastEvent(req, EventTypes.messageCreated, publicMessage(message), [
      ChannelFactory.conversationChannel(message.conversationId)
   ]);
}
