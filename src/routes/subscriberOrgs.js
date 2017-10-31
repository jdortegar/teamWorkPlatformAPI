import express from 'express';
import { apiVersionedValidators, validateByApiVersion } from '../config/param-validation';
import * as subscriberOrgs from '../controllers/subscriberOrgs';

const router = express.Router();

router.route('/getSubscriberOrgs')
   .get(subscriberOrgs.getSubscriberOrgs);

router.route('/createSubscriberOrg')
   .post(validateByApiVersion(apiVersionedValidators.createSubscriberOrg), subscriberOrgs.createSubscriberOrg);

router.route('/updateSubscriberOrg/:subscriberOrgId')
   .patch(validateByApiVersion(apiVersionedValidators.updateSubscriberOrg), subscriberOrgs.updateSubscriberOrg);

router.route('/getSubscribers/:subscriberOrgId')
   .get(subscriberOrgs.getSubscriberOrgUsers);

router.route('/inviteSubscribers/:subscriberOrgId')
   .post(validateByApiVersion(apiVersionedValidators.inviteSubscribers), subscriberOrgs.inviteSubscribers);

router.route('/replyToInvite/:subscriberOrgId')
   .post(validateByApiVersion(apiVersionedValidators.replyToInvite), subscriberOrgs.replyToInvite);

export default router;
