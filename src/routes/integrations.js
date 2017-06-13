import express from 'express';
import * as box from '../controllers/box';
import * as integrations from '../controllers/integrations';

const router = express.Router();

router.route('/getIntegrations')
   .get(integrations.getIntegrations);

router.route('/box/integrate/:subscriberOrgId')
   .get(box.integrateBox);

router.route('/box/access')
   .get(box.boxAccess);

export default router;

