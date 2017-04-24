import httpStatus from 'http-status';
import moment from 'moment';
import APIError from '../helpers/APIError';
import conversationsSvc, { ConversationNotExistError } from '../services/conversationService';
import { NoPermissionsError } from '../services/teamService';
import { publicConversations, publicMessage, publicMessages } from './publicData';


export function getConversations(req, res, next) {
   const userId = req.user._id;
   const { teamRoomId } = req.query;

   conversationsSvc.getConversations(req, userId, teamRoomId)
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

export function createMessage(req, res, next) {
   const userId = req.user._id;
   const conversationId = req.params.conversationId;
   const { messageType, text, replyTo } = req.body;
   req.now = moment.utc();
   conversationsSvc.createMessage(req, conversationId, userId, messageType, text, replyTo)
      .then((dbMessage) => {
         res.status(httpStatus.CREATED).json({ message: publicMessage(dbMessage) });
      })
      .catch((err) => {
         if (err instanceof ConversationNotExistError) {
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            next(new APIError(err, httpStatus.SERVICE_UNAVAILABLE));
         }
      });
}
