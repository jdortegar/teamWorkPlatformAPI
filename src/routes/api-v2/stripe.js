import express from 'express';
import * as payment from '../../controllers/api-v2/stripe';
import { apiVersionedValidators, validateByApiVersion } from '../../config/param-validation';

const router = express.Router();

router.route('/payments').post(payment.doPayment);

router.route('/coupons').get(payment.getCoupons);

router.route('/subscriptions/:subscriptionId').get(payment.getSubscription);

router.route('/subscriptions')
    .patch(validateByApiVersion(apiVersionedValidators.updateStripeSubscription), payment.updateSubscription);

router.route('/subscriptions').delete(payment.deleteSubscription);

export default router;
