// Stripe service for billing
import config from '../../config/env';
import { SubscriberUserExistsError } from '../../services/errors';
import * as usersTable from '../../repositories/db/usersTable';
import * as subscriberOrgsTable from '../../repositories/db/subscriberOrgsTable';
import paypal from 'paypal-rest-sdk';

// Paypal Setup (Mode and Credentials)

paypal.configure({
   mode: config.paypalConfig.mode,
   client_id: config.paypalConfig.clientId,
   client_secret: config.paypalConfig.clientSecret
});

// Make Promise for handle async Paypal subscription
const sendSubscription = create_payment_json => {
   return new Promise((resolve, reject) => {
      paypal.payment.create(create_payment_json, function(error, payment) {
         if (error) {
            return reject(error);
         }
         return resolve(payment);
      });
   });
};

// Subscription request
export const doSubscription = async (req, res, next) => {
   let paypalResponse;

   try {
      const create_payment_json = {
         intent: 'sale',
         payer: {
            payment_method: 'paypal'
         },
         redirect_urls: {
            return_url: 'http://localhost:3000/v2/subscriptions/paypal/success',
            cancel_url: 'http://yahoo.com'
         },
         transactions: [
            {
               item_list: {
                  items: [
                     {
                        name: 'item',
                        sku: 'item',
                        price: '1.00',
                        currency: 'USD',
                        quantity: 1
                     }
                  ]
               },
               amount: {
                  currency: 'USD',
                  total: '1.00'
               },
               description: 'This is the payment description.'
            }
         ]
      };

      const paypalResponse = await sendSubscription(create_payment_json);
      console.log('response', paypalResponse);

      return paypalResponse;
   } catch (err) {
      console.log(err);
      // This is where you handle declines and errors.
      // For the demo we simply set to failed.
      return Promise.reject(err);
   }
};

// Make Promise for handle async Paypal payment
const sendPayment = (paymentId, execute_payment_json) => {

   console.log('function', paymentId, execute_payment_json);
   return new Promise((resolve, reject) => {
      paypal.payment.execute(paymentId, execute_payment_json, function(error, payment) {
         if (error) {
            return reject(error);
         }
         return resolve(payment);
      });
   });
};

// Execute Payment
export const doExecute = async (req, res, next) => {
   const payerId = req.query.PayerID;
   const paymentId = req.query.paymentId;

   try {
      const execute_payment_json = {
         payer_id: payerId,
         transactions: [
            {
               amount: {
                  currency: 'USD',
                  total: '1.00'
               }
            }
         ]
      };

      const paypalResponse = await sendPayment(paymentId, execute_payment_json);
      console.log('RESPOOONSE', paypalResponse);

      return paypalResponse;
   } catch (err) {
      console.log(err);
      // This is where you handle declines and errors.
      // For the demo we simply set to failed.
      return Promise.reject(err);
   }
};
