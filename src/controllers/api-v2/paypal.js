import httpStatus from 'http-status';
import * as paypalSvc from '../../services/paypal/paypalService';
import { SubscriberUserExistsError, CancelSubscriptionError } from '../../services/errors';
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
      const { orgId } = req.query;
      if (orgId) {
         return res.redirect(`${config.webappBaseUri}/app/organization/${orgId}/${agreement.id}`);
      }

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
      if (err instanceof CancelSubscriptionError){
         return res.status(httpStatus.BAD_REQUEST).json({error: 'Bad Request', message: 'Subscription already cancelled'})
      }
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

export const getAgreement = async (req, res) => {
   try {
      const agreement = await paypalSvc.getAgreement(req, req.body);
      return res.json(agreement);
   } catch (err) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};
