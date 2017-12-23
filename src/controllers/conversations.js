import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import { apiVersionedVisibility, publishByApiVersion } from '../helpers/publishedVisibility';
import * as conversationsSvc from '../services/conversationService';
import { NotActiveError, ConversationNotExistError, NoPermissionsError } from '../services/errors';


export const getConversations = (req, res, next) => {
   const userId = req.user._id;
   const { teamRoomId } = req.query;

   conversationsSvc.getConversations(req, userId, teamRoomId)
      .then((conversations) => {
         res.status(httpStatus.OK).json({ conversations: publishByApiVersion(req, apiVersionedVisibility.publicConversations, conversations) });
      })
      .catch((err) => {
         next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
      });
};

export const getTranscript = (req, res, next) => {
   const userId = req.user._id;
   const conversationId = req.params.conversationId;
   const since = req.query.since;
   const until = req.query.until;
   const minLevel = (req.query.minLevel) ? parseInt(req.query.minLevel, 10) : undefined;
   const maxLevel = (req.query.maxLevel) ? parseInt(req.query.maxLevel, 10) : undefined;
   const maxCount = (req.query.maxCount) ? parseInt(req.query.maxCount, 10) : undefined;

   conversationsSvc.getMessages(req, conversationId, userId, { since, until, minLevel, maxLevel, maxCount })
      .then((messages) => {
         res.status(httpStatus.OK).json({ messages: publishByApiVersion(req, apiVersionedVisibility.publicMessages, messages) });
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
};

export const getReadMessages = (req, res, next) => {
   const userId = req.user._id;
   const conversationId = req.query.conversationId;

   conversationsSvc.getReadMessages(req, userId, conversationId)
      .then((readMessages) => {
         res.status(httpStatus.OK).json({ readMessages: publishByApiVersion(req, apiVersionedVisibility.publicReadMessages, readMessages) });
      })
      .catch((err) => {
         if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else {
            next(new APIError(err, httpStatus.INTERNAL_SERVER_ERROR));
         }
      });
};

export const createMessage = (req, res, next) => {
   const userId = req.user._id;
   const conversationId = req.params.conversationId;
   const { messageType, text, replyTo } = req.body; // eslint-disable-line no-unused-vars
   let { content } = req.body;

   // TODO: deprecated in v1.  messageType, text
   if (req.apiVersion === 0) {
      content = [];
      content.push({ type: 'text/plain', text });
   }

   conversationsSvc.createMessage(req, conversationId, userId, content, replyTo)
      .then((dbMessage) => {
         res.status(httpStatus.CREATED).json({ message: publishByApiVersion(req, apiVersionedVisibility.publicMessage, dbMessage) });
      })
      .catch((err) => {
         if (err instanceof ConversationNotExistError) {
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else if (err instanceof NotActiveError) {
            res.status(httpStatus.METHOD_NOT_ALLOWED).end();
         } else {
            next(new APIError(err, httpStatus.SERVICE_UNAVAILABLE));
         }
      });
};

export const readMessage = (req, res, next) => {
   const userId = req.user._id;
   const conversationId = req.params.conversationId;
   const parentMessageId = req.query.parentMessageId;

   conversationsSvc.readMessage(req, userId, conversationId, parentMessageId)
      .then((dbMessage) => {
         res.status(httpStatus.CREATED).json({ message: publishByApiVersion(req, apiVersionedVisibility.publicMessage, dbMessage) });
      })
      .catch((err) => {
         if (err instanceof ConversationNotExistError) {
            res.status(httpStatus.NOT_FOUND).end();
         } else if (err instanceof NoPermissionsError) {
            res.status(httpStatus.FORBIDDEN).end();
         } else if (err instanceof NotActiveError) {
            res.status(httpStatus.METHOD_NOT_ALLOWED).end();
         } else {
            next(new APIError(err, httpStatus.SERVICE_UNAVAILABLE));
         }
      });
};

