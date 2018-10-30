import httpStatus from 'http-status';
import * as stripeSvc from '../../services/stripe/stripeService';

export const doPayment = async (req, res) => {
   try {
      const payment = await stripeSvc.doPayment(req, req.body);
      return res.json(payment);
   } catch (err) {
      console.log(err);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};

export const getCoupons = async (req, res) => {
   try {
      const coupons = await stripeSvc.getcoupons(req, req.body);
      return res.json(coupons);
   } catch (err) {
      console.log(err);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
         error: 'Internal Server Error',
         message: 'Something went wrong'
      });
   }
};
