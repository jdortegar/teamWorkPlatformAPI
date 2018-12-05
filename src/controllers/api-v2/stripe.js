import httpStatus from 'http-status';
import * as stripeSvc from '../../services/stripe/stripeService';
import { SubscriberUserExistsError, CouponExpiredError } from '../../services/errors';

export const doPayment = async (req, res) => {
   try {
      const payment = await stripeSvc.doPayment(req, req.body);
      return res.json(payment);
   } catch (err) {
      // Return error when email exists
      if (err instanceof CouponExpiredError){
         return res.status(httpStatus.BAD_REQUEST).json({error: 'Bad Request', message: 'Promo Code Expired'})
      }
      if (err instanceof SubscriberUserExistsError) {
         return res.status(httpStatus.CONFLICT).json({ error: 'Conflict', message: 'This email already exists' });
      }

      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};

export const getCoupons = async (req, res) => {
   try {
      const coupons = await stripeSvc.getCoupons(req, req.body);
      return res.json(coupons);
   } catch (err) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};

export const updateSubscription = async (req, res) => {
   try {
      const subscription = await stripeSvc.updateSubscription(req, req.body);
      return res.json(subscription);
   } catch (err) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};

export const deleteSubscription = async (req, res) => {
   try {
      const subscription = await stripeSvc.deleteSubscription(req, req.body);
      return res.json(subscription);
   } catch (err) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};

export const getSubscription = async (req, res) => {
   try {
      const subscription = await stripeSvc.getSubscription(req, req.params.subscriptionId);
      return res.json(subscription);
   } catch (err) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};

export const doTrialSubscription = async (req, res) => {
   try {
      const trial = await stripeSvc.doTrialSubscription(req, req.body);
      return res.json(trial);
   } catch (err) {
      // Return error when email exists
      if (err instanceof SubscriberUserExistsError) {
         return res.status(httpStatus.CONFLICT).json({ error: 'Conflict', message: 'This email already exists' });
      }

      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};
