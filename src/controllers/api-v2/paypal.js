import httpStatus from 'http-status';
import * as paypalSvc from '../../services/paypal/paypalService';
import { SubscriberUserExistsError, CouponExpiredError } from '../../services/errors';
import config from '../../config/env';

export const doSubscription = async (req, res) => {
   try {
      const subscription = await paypalSvc.doSubscription(req, req.body);
      return res.json(subscription);
   } catch (err) {
      if (err instanceof SubscriberUserExistsError) {
         return res.status(httpStatus.CONFLICT).json({ error: 'Conflict', message: 'This email already exists' });
      }
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};

export const processAgreement = async (req, res) => {
   try {
      const agreement = await paypalSvc.processAgreement(req, req.body);
      return res.redirect(`${config.webappBaseUri}/createAccount`);

   } catch (err) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};

export const cancelAgreement = async (req, res) => {
   try {
      const agreement = await paypalSvc.cancelAgreement(req, req.body);
      return res.json(agreement);
   } catch (err) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};

export const updateAgreement = async (req, res) => {
   try {
      const agreement = await paypalSvc.updateAgreement(req, req.body);
      return res.json(agreement);
   } catch (err) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};
