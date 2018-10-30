import express from 'express';
import * as payment from '../../controllers/api-v2/stripe';

const router = express.Router();

router.route('/payments').post(payment.doPayment);

router.route('/coupons').get(payment.getCoupons);

export default router;
