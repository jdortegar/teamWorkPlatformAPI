import express from 'express';
import * as paypal from '../../controllers/api-v2/paypal';
import { apiVersionedValidators, validateByApiVersion } from '../../config/param-validation';

const router = express.Router();

router.route('/subscriptions/paypal').post(paypal.doSubscription);

router.route('/subscriptions/paypal/success').post(paypal.doExecute);

router.route('/subscriptions/paypal/createplan').post(paypal.createPlan);

router.route('/subscriptions/paypal/createagreement').get(paypal.createAgreement);

router.route('/subscriptions/paypal/processagreement').get(paypal.processAgreement);

router.route('/subscriptions/paypal/cancelagreement').get(paypal.cancelAgreement);

router.route('/subscriptions/paypal/updateagreement').post(paypal.updateAgreement);

export default router;
