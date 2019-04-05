import httpStatus from 'http-status';
import { apiVersionedVisibility, publishByApiVersion } from '../helpers/publishedVisibility';
import * as conversationsSvc from '../services/conversationService';
import { APIError, APIWarning, NotActiveError, ConversationNotExistError, NoPermissionsError, MessageNotExistError } from '../services/errors';


export const getConversations = (req, res, next) => {
   const userId = req.user._id;
   const { teamId } = req.query;

   conversationsSvc.getConversations(req, userId, teamId)
      .then((conversations) => {
         res.status(httpStatus.OK).json({ conversations: publishByApiVersion(req, apiVersionedVisibility.publicConversations, conversations) });
      })
      .catch((err) => {
         next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
      });
};

export const getBookmarkedMessages = (req, res, next) => {
   const userId = req.user._id;

   conversationsSvc.getBookmarkedMessages(req, userId)
      .then((messages) => {
         res.status(httpStatus.OK).json({ conversations: publishByApiVersion(req, apiVersionedVisibility.publicMessages, messages) });
      })
      .catch((err) => {
         next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
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
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else if (err instanceof NoPermissionsError) {
            next(new APIWarning(httpStatus.FORBIDDEN, err));
         } else {
            next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
         }
      });
};

export const getMessages = (req, res, next) => {
   const { messages: conversationIdsMessageIds } = req.body;

   conversationsSvc.getMessagesByConversationIdsAndMessageIds(req, conversationIdsMessageIds)
      .then((messages) => {
         res.status(httpStatus.OK).json({ messages: publishByApiVersion(req, apiVersionedVisibility.publicMessages, messages) });
      })
      .catch((err) => {
         next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
      });
};

export const createMessage = (req, res, next) => {
   const userId = req.user._id;
   const conversationId = req.params.conversationId;
   const { text, replyTo } = req.body;
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
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else if (err instanceof NoPermissionsError) {
            next(new APIWarning(httpStatus.FORBIDDEN, err));
         } else if (err instanceof NotActiveError) {
            next(new APIWarning(httpStatus.METHOD_NOT_ALLOWED, err));
         } else {
            next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err));
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
            next(new APIWarning(httpStatus.FORBIDDEN, err));
         } else {
            next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
         }
      });
};

export const readMessage = (req, res, next) => {
   const userId = req.user._id;
   const { conversationId } = req.params;
   const { messageId } = req.body;

   conversationsSvc.readMessage(req, userId, conversationId, messageId)
      .then(() => {
         next(new APIWarning(httpStatus.NO_CONTENT));
      })
      .catch((err) => {
         if (err instanceof ConversationNotExistError) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else {
            next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err));
         }
      });
};

export const updateMessage = (req, res, next) => {
   const userId = req.user._id;
   const { conversationId, messageId } = req.params;
   const { content } = req.body;

   conversationsSvc.updateMessage(req, conversationId, messageId, userId, content)
      .then((updatedMessage) => {
         res.status(httpStatus.OK).json({ message: publishByApiVersion(req, apiVersionedVisibility.publicMessage, updatedMessage) });
      })
      .catch((err) => {
         if (err instanceof ConversationNotExistError) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else if (err instanceof NoPermissionsError) {
            next(new APIWarning(httpStatus.FORBIDDEN, err));
         } else if (err instanceof NotActiveError) {
            next(new APIWarning(httpStatus.METHOD_NOT_ALLOWED, err));
         } else {
            next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err));
         }
      });
};

export const deleteMessage = (req, res, next) => {
   const userId = req.user._id;
   const { conversationId, messageId } = req.params;

   conversationsSvc.deleteMessage(req, conversationId, messageId, userId)
      .then(() => {
         next(new APIWarning(httpStatus.NO_CONTENT));
      })
      .catch((err) => {
         if (err instanceof ConversationNotExistError) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else if (err instanceof NoPermissionsError) {
            next(new APIWarning(httpStatus.FORBIDDEN, err));
         } else if (err instanceof NotActiveError) {
            next(new APIWarning(httpStatus.METHOD_NOT_ALLOWED, err));
         } else {
            next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err));
         }
      });
};

export const likeMessage = (req, res, next) => {
   const userId = req.user._id;
   const { conversationId, messageId } = req.params;
   const { like } = req.body;

   conversationsSvc.likeMessage(req, conversationId, messageId, userId, like)
      .then(() => {
         res.status(httpStatus.OK).end();
      })
      .catch((err) => {
         if (err instanceof MessageNotExistError) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else {
            next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err));
         }
      });
};

export const dislikeMessage = (req, res, next) => {
   const userId = req.user._id;
   const { conversationId, messageId } = req.params;
   const { dislike } = req.body;

   conversationsSvc.dislikeMessage(req, conversationId, messageId, userId, dislike)
      .then(() => {
         res.status(httpStatus.OK).end();
      })
      .catch((err) => {
         if (err instanceof MessageNotExistError) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else {
            next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err));
         }
      });
};

export const flagMessage = (req, res, next) => {
   const userId = req.user._id;
   const { conversationId, messageId } = req.params;
   const { flag } = req.body;

   conversationsSvc.flagMessage(req, conversationId, messageId, userId, flag)
      .then(() => {
         res.status(httpStatus.OK).end();
      })
      .catch((err) => {
         if (err instanceof MessageNotExistError) {
            next(new APIWarning(httpStatus.NOT_FOUND, err));
         } else {
            next(new APIError(httpStatus.SERVICE_UNAVAILABLE, err));
         }
      });
};
