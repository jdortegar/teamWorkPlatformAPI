// Stripe service for billing
import config from '../../config/env';
import Stripe from 'stripe';
const stripe = Stripe(config.stripeConfig.stripe.secretKey);
stripe.setApiVersion(config.stripeConfig.stripe.apiVersion);

export const doPayment = async (req, res, next) => {
   // subscripber data
   let paymentData = req.body;

   // Create customer
   const customerEmail = paymentData.email;
   // Encrypted credit crad data
   const token = paymentData.stripeToken;
   // Amount to charge in cents
   const amount = parseFloat(req.body.amount) * 100;
   const coupon = paymentData.promocode || null;
   let stripeResponse;

   try {
      const customer = await stripe.customers.create({
         email: customerEmail,
         description: paymentData.name,
         metadata: {
            adress: paymentData.address_line1,
            city: paymentData.address_city
         },
         source: token
      });

      if (paymentData.contract === 'subscription' && paymentData.subscriptionType === 'monthly') {
         stripeResponse = stripe.subscriptions.create({
            customer: customer.id,
            coupon: coupon,
            items: [
               {
                  plan: 'plan_DsRNYJSVq6yPgh',
                  quantity: paymentData.users
               }
            ]
         });
      } else if (paymentData.contract === 'subscription' && paymentData.subscriptionType === 'annually') {
         stripeResponse = stripe.subscriptions.create({
            customer: customer.id,
            coupon: coupon,
            items: [
               {
                  plan: 'plan_DsSgjJ4Mm9vnIR',
                  quantity: paymentData.users
               }
            ]
         });
      } else {
         stripeResponse = stripe.subscriptions.create({
            customer: customer.id,
            coupon: coupon,
            items: [
               {
                  plan: 'plan_DsSooTYkPx1LbU',
                  quantity: paymentData.users
               }
            ]
         });
      }

      return stripeResponse;
   } catch (err) {
      // This is where you handle declines and errors.
      // For the demo we simply set to failed.
      Promise.reject(err);
   }
};

export const getcoupons = async (req, res) => {
   try {
      return await stripe.coupons.list();
   } catch (err) {
      // This is where you handle declines and errors.
      // For the demo we simply set to failed.
      Promise.reject(err);
   }
};
