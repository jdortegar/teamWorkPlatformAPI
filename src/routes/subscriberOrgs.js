import express from 'express';
import validate from 'express-validation';
import paramValidation from '../config/param-validation';
import * as subscriberOrgs from '../controllers/subscriberOrgs';

const router = express.Router();

router.route('/getSubscriberOrgs')
   .get(subscriberOrgs.getSubscriberOrgs);

router.route('/createSubscriberOrg')
   .post(validate(paramValidation.createSubscriberOrg), subscriberOrgs.createSubscriberOrg);

router.route('/updateSubscriberOrg/:subscriberOrgId')
   .patch(validate(paramValidation.updateSubscriberOrg), subscriberOrgs.updateSubscriberOrg);

router.route('/getSubscribers/:subscriberOrgId')
   .get(subscriberOrgs.getSubscriberOrgUsers);

router.route('/inviteSubscribers/:subscriberOrgId')
   .post(validate(paramValidation.inviteSubscribers), subscriberOrgs.inviteSubscribers);

export default router;
