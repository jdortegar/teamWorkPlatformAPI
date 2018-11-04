import httpStatus from 'http-status';
import * as stripeSvc from '../../services/stripe/stripeService';

export const doPayment = async (req, res) => {
   try {
      const payment = await stripeSvc.doPayment(req, req.body);
      return res.json(payment);
   } catch (err) {
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
