import express from 'express';
import validate from 'express-validation';
import paramValidation from '../config/param-validation';
import * as subscriberOrgs from '../controllers/subscriberOrgs';

const router = express.Router();

router.route('/getSubscriberOrgs')
   .get(subscriberOrgs.getSubscriberOrgs);

router.route('/createSubscriberOrg')
   .post(validate(paramValidation.createSubscriberOrg), subscriberOrgs.create)

router.route('/getSubscribers/:subscriberOrgId')
   .get(subscriberOrgs.getSubscriberOrgUsers);

export default router;
