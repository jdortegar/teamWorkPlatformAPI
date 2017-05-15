import httpStatus from 'http-status';
import moment from 'moment';
import APIError from '../helpers/APIError';
import { publicConversations, publicMessage, publicMessages } from '../helpers/publishedVisibility';
import conversationsSvc from '../services/conversationService';
import { ConversationNotExistError, NoPermissionsError } from '../services/errors';


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
   const since = req.query.since;
   const until = req.query.until;
   const minLevel = (req.query.minLevel) ? parseInt(req.query.minLevel) : undefined;
   const maxLevel = (req.query.maxLevel) ? parseInt(req.query.maxLevel) : undefined;
   const maxCount = (req.query.maxCount) ? parseInt(req.query.maxCount) : undefined;

   conversationsSvc.getMessages(req, conversationId, userId, { since, until, minLevel, maxLevel, maxCount })
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
   req.now = moment.utc(); // TODO: create middleware.
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
