import express from 'express';
import validate from 'express-validation';
import paramValidation from '../config/param-validation';
import * as conversations from '../controllers/conversations';

const router = express.Router();

router.route('/getConversations')
   .get(conversations.getConversations);

router.route('/getTranscript/:conversationId')
   .get(conversations.getTranscript);

router.route('/:conversationId/createMessage')
   .post(validate(paramValidation.createMessage), conversations.createMessage);

export default router;
