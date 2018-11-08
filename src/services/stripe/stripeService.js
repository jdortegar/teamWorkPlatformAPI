// Stripe service for billing
import config from '../../config/env';
import Stripe from 'stripe';
import { SubscriberUserExistsError } from '../../services/errors';
import * as usersTable from '../../repositories/db/usersTable';
const stripe = Stripe(config.stripeConfig.stripe.secretKey);
stripe.setApiVersion(config.stripeConfig.stripe.apiVersion);

export const doPayment = async (req, res, next) => {
   // Subscripber data
   let paymentData = req.body;
   // Get customer email
   const customerEmail = paymentData.email;

   // validate if email exists
   const existingUser = await usersTable.getUserByEmailAddress(req, customerEmail);
   if (existingUser) {
      throw new SubscriberUserExistsError(customerEmail);
   }

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
                  plan: 'plan_DtzToEv1gIBqa0',
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

export const getCoupons = async (req, res) => {
   try {
      return await stripe.coupons.list();
   } catch (err) {
      // This is where you handle declines and errors.
      // For the demo we simply set to failed.
      Promise.reject(err);
   }
};

export const updateSubscription = async (req, res, next) => {
   const subscriptionUpdateData = req.body;
   const subscriptionId = subscriptionUpdateData.subscriptionId;
   const coupon = subscriptionUpdateData.promocode || null;
   let stripeResponse;

   try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionUpdateData.subscriptionId);

      if ('cancel_at_period_end' in subscriptionUpdateData) {
         stripeResponse = stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: subscriptionUpdateData.cancel_at_period_end
         });
      }

      if (subscriptionUpdateData.subscriptionType === 'monthly') {
         stripeResponse = stripe.subscriptions.update(subscriptionId, {
            coupon: coupon,
            items: [
               {
                  id: subscription.items.data[0].id,
                  plan: 'plan_DsRNYJSVq6yPgh',
                  quantity: subscriptionUpdateData.users
               }
            ]
         });
      } else if (subscriptionUpdateData.subscriptionType === 'annually') {
         stripeResponse = stripe.subscriptions.update(subscriptionId, {
            coupon: coupon,
            items: [
               {
                  id: subscription.items.data[0].id,
                  plan: 'plan_DsSgjJ4Mm9vnIR',
                  quantity: subscriptionUpdateData.users
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

export const deleteSubscription = async (req, res) => {
   const subscriptionId = req.body.subscriptionId;

   try {
      return await stripe.subscriptions.del(subscriptionId);
   } catch (err) {
      // This is where you handle declines and errors.
      // For the demo we simply set to failed.
      Promise.reject(err);
   }
};

export const getSubscription = async (req, subscriptionId) => {
   try {
      return await stripe.subscriptions.retrieve(subscriptionId);
   } catch (err) {
      // This is where you handle declines and errors.
      // For the demo we simply set to failed.
      Promise.reject(err);
   }
};
