import express from 'express';
import { apiVersionedValidators, validateByApiVersion } from '../config/param-validation';
import * as conversations from '../controllers/conversations';

const router = express.Router();

router.route('/getConversations')
   .get(conversations.getConversations);

router.route('/getBookmarkedMessages')
   .get(conversations.getBookmarkedMessages);

router.route('/getTranscript/:conversationId')
   .get(conversations.getTranscript);

router.route('/:conversationId/createMessage')
   .post(validateByApiVersion(apiVersionedValidators.createMessage), conversations.createMessage);

router.route('/:conversationId/updateMessage/:messageId')
   .patch(validateByApiVersion(apiVersionedValidators.updateMessage), conversations.updateMessage);

router.route('/:conversationId/deleteMessage/:messageId')
   .delete(conversations.deleteMessage);

router.route('/:conversationId/likeMessage/:messageId')
   .post(validateByApiVersion(apiVersionedValidators.likeMessage), conversations.likeMessage);

router.route('/:conversationId/dislikeMessage/:messageId')
   .post(validateByApiVersion(apiVersionedValidators.dislikeMessage), conversations.dislikeMessage);

router.route('/:conversationId/flagMessage/:messageId')
   .post(validateByApiVersion(apiVersionedValidators.flagMessage), conversations.flagMessage);

router.route('/:conversationId/readMessage')
   .post(validateByApiVersion(apiVersionedValidators.readMessage), conversations.readMessage);

router.route('/getReadMessages')
   .get(conversations.getReadMessages);

export default router;
