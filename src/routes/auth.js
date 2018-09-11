import express from 'express';
import { apiVersionedValidators, validateByApiVersion } from '../config/param-validation';
import * as auth from '../controllers/auth';

const router = express.Router();

router.route('/login')
   .post(validateByApiVersion(apiVersionedValidators.login), auth.login);

router.route('/logout')
   .get(auth.logout);

router.route('/registerAWSCustomer')
   .post(auth.resolveAwsCustomer);

router.route('/handleAWSEntitlementEvent')
   .post(auth.handleAWSEntitlementEvent);

export default router;
