import express from 'express';
import * as ckg from '../controllers/ckg';

const router = express.Router();

router.route('/getFiles/:subscriberOrgId')
  .get(ckg.getFiles);

export default router;
