import messagingSvc from './messagingService';

export function messageCreated(req, message, conversationId) {
   return messagingSvc.event(req, message);
}
