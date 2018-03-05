import express from 'express';
import * as box from '../controllers/box';
import * as google from '../controllers/google';
import * as sharepoint from '../controllers/sharepoint';
import * as integrations from '../controllers/integrations';
import { apiVersionedValidators, validateByApiVersion } from '../config/param-validation';

const router = express.Router();

router.route('/getIntegrations')
   .get(integrations.getIntegrations);


router.route('/box/integrate/:subscriberOrgId')
   .get(box.integrateBox);

router.route('/box/access')
   .get(box.boxAccess);

router.route('/box/revoke/:subscriberOrgId')
   .post(box.revokeBox);

router.route('/box/webhooks')
   .post(box.boxWebhooks);


router.route('/google/integrate/:subscriberOrgId')
   .get(google.integrateGoogle);

router.route('/google/access')
   .get(google.googleAccess);

router.route('/google/revoke/:subscriberOrgId')
   .post(google.revokeGoogle);

router.route('/google/webhooks')
   .post(google.googleWebhooks);


router.route('/sharepoint/integrate/:subscriberOrgId')
   .get(sharepoint.integrateSharepoint);

router.route('/sharepoint/access')
   .get(sharepoint.sharepointAccess);

router.route('/sharepoint/revoke/:subscriberOrgId')
   .post(sharepoint.revokeSharepoint);

router.route('/:target/configure/:subscriberOrgId')
   .patch(validateByApiVersion(apiVersionedValidators.configureIntegration), integrations.configureIntegration);

export default router;
