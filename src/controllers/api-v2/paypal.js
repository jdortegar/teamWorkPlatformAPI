import httpStatus from 'http-status';
import * as paypalSvc from '../../services/paypal/paypalService';
import { SubscriberUserExistsError, CouponExpiredError } from '../../services/errors';

export const doSubscription = async (req, res) => {
   try {
      const subscription = await paypalSvc.doSubscription(req, req.body);
      return res.json(subscription);
   } catch (err) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};

export const doExecute = async (req, res) => {
   try {
      const payment = await paypalSvc.doExecute(req, req.body);
      return res.json(payment);
   } catch (err) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};

export const createPlan = async (req, res) => {
   try {
      const plan = await paypalSvc.createPlan(req, req.body);
      return res.json(plan);
   } catch (err) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};

export const createAgreement = async (req, res) => {
   try {
      const agreement = await paypalSvc.createAgreement(req, req.body);
      return res.json(agreement);
   } catch (err) {
      console.log(err);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};

export const processAgreement = async (req, res) => {
   try {
      const agreement = await paypalSvc.processAgreement(req, req.body);
      return res.json(agreement);
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
