import express from 'express';
import * as auth from '../../controllers/api-v2/auth';

const router = express.Router();

router.route('/auth/meet')
    .get(auth.validateMeetToken);