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
