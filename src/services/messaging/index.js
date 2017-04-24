import messagingSvc, { ChannelFactory, EventTypes } from './messagingService';


// EventType = presence

export function presenceChanged(req, userId, presenceStatus, presenceMessage = undefined) {
   return messagingSvc._presenceChanged(req, EventTypes.presence, { userId, presenceStatus, presenceMessage });
}


// EventType = message

export function messageCreated(req, message) {
   return messagingSvc.broadcastEvent(req, EventTypes.message, message, ChannelFactory.conversationChannel(message.conversationId));
}
