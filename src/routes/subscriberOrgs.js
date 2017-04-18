import express from 'express';
import * as subscriberOrgs from '../controllers/subscriberOrgs';

const router = express.Router();

router.route('/getSubscriberOrgs')
  .get(subscriberOrgs.getSubscriberOrgs);

router.route('/getSubscribers/:subscriberOrgId')
   .get(subscriberOrgs.getSubscriberOrgUsers);

export default router;
