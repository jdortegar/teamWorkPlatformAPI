import express from 'express';
import * as messaging from '../controllers/messaging';

const router = express.Router();

router.route('/events')
   .post(messaging.events);

export default router;
