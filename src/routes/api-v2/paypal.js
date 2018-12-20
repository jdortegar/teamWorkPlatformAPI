import express from 'express';
import * as paypal from '../../controllers/api-v2/paypal';
import { apiVersionedValidators, validateByApiVersion } from '../../config/param-validation';

const router = express.Router();

router.route('/subscriptions/paypal').post(paypal.doSubscription);

router.route('/subscriptions/paypal/success').post(paypal.doExecute);

export default router;
