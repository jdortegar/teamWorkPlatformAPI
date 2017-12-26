import express from 'express';
import { apiVersionedValidators, validateByApiVersion } from '../config/param-validation';
import * as conversations from '../controllers/conversations';

const router = express.Router();

router.route('/getConversations')
   .get(conversations.getConversations);

router.route('/getTranscript/:conversationId')
   .get(conversations.getTranscript);

router.route('/getReadMessages')
   .get(conversations.getReadMessages);

router.route('/:conversationId/readMessage')
   .post(validateByApiVersion(apiVersionedValidators.readMessage), conversations.readMessage);

router.route('/:conversationId/createMessage')
   .post(validateByApiVersion(apiVersionedValidators.createMessage), conversations.createMessage);

export default router;
