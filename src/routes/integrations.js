import express from 'express';
import * as box from '../controllers/box';
import * as google from '../controllers/google';
import * as sharepoint from '../controllers/sharepoint';
import * as onedrive from '../controllers/onedrive';
import * as salesforce from '../controllers/salesforce';
import * as dropbox from '../controllers/dropbox';
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

router.route('/box/app')
   .get(box.boxApp);

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


router.route('/onedrive/integrate/:subscriberOrgId')
   .get(onedrive.integrateOnedrive);

router.route('/onedrive/access')
   .get(onedrive.onedriveAccess);

router.route('/onedrive/revoke/:subscriberOrgId')
   .post(onedrive.revokeOnedrive);


router.route('/salesforce/integrate/:subscriberOrgId')
   .get(salesforce.integrateSalesforce);

router.route('/salesforce/access')
   .get(salesforce.salesforceAccess);

router.route('/salesforce/revoke/:subscriberOrgId')
   .post(salesforce.revokeSalesforce);

router.route('/dropbox/integrate/:subscriberOrgId')
   .get(dropbox.integrateDropbox);

router.route('/dropbox/access')
   .get(dropbox.dropboxAccess);

router.route('/dropbox/revoke/:subscriberOrgId')
   .get(dropbox.revokeDropbox);

export default router;
