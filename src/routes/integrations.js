import express from 'express';
import * as box from '../controllers/box';

const router = express.Router();

router.route('/box/integrate/:subscriberOrgId')
   .get(box.integrateBox);

router.route('/box/access')
   .get(box.boxAccess);

export default router;

