import express from 'express';
import * as conversations from '../../controllers/api-v2/conversations';

const router = express.Router();

router.route('/conversations')
    .post(conversations.createConversation);

export default router;
