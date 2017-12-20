import express from 'express';
import { apiVersionedValidators, validateByApiVersion } from '../config/param-validation';
import * as conversations from '../controllers/conversations';

const router = express.Router();

router.route('/getConversations')
   .get(conversations.getConversations);

router.route('/getTranscript/:conversationId')
   .get(conversations.getTranscript);

router.route('/getUnreadMessages')
   .get(conversations.getUnreadMessages);

router.route('/readMessages/:conversationId')
   .post(conversations.readMessage);

router.route('/:conversationId/createMessage')
   .post(validateByApiVersion(apiVersionedValidators.createMessage), conversations.createMessage);

export default router;
