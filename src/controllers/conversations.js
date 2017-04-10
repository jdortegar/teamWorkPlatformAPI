import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import conversationsSvc, { ConversationNotExistError } from '../services/conversationService';
import { NoPermissionsError } from '../services/teamService';
import { publicConversations, publicMessages } from './publicData';


export function getConversations(req, res, next) {
   const userId = req.user._id;

   conversationsSvc.getConversations(req, userId)
      .then((conversations) => {
         res.status(httpStatus.OK).json({ conversations: publicConversations(conversations) });
      })
      .catch((err) => {
         console.error(err);
         next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
      });
}

export function getTranscript(req, res, next) {
   const userId = req.user._id;
   const conversationId = req.params.conversationId;

   conversationsSvc.getMessages(req, conversationId, userId)
      .then((messages) => {
         res.status(httpStatus.OK).json({ messages: publicMessages(messages) });
      })
      .catch((err) => {
         if (err instanceof ConversationNotExistError) {
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
         }
      });
}
