import express from 'express';
import * as conversations from '../controllers/conversations';

const router = express.Router();

router.route('/getConversations')
   .get(conversations.getConversations);

router.route('/getTranscript/:conversationId')
   .get(conversations.getTranscript);

export default router;
