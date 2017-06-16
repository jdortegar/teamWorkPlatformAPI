import express from 'express';
import * as box from '../controllers/box';
import * as google from '../controllers/google';
import * as integrations from '../controllers/integrations';

const router = express.Router();

router.route('/getIntegrations')
   .get(integrations.getIntegrations);


router.route('/box/integrate/:subscriberOrgId')
   .get(box.integrateBox);

router.route('/box/access')
   .get(box.boxAccess);


router.route('/google/integrate/:subscriberOrgId')
   .get(google.integrateGoogle);

router.route('/google/access')
   .get(google.googleAccess);

export default router;

