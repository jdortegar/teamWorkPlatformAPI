// Stripe service for billing
import config from '../../config/env';
import Stripe from 'stripe';
import moment from 'moment';
import { SubscriberUserExistsError, CouponExpiredError } from '../../services/errors';
import * as usersTable from '../../repositories/db/usersTable';
import * as subscriberOrgsTable from '../../repositories/db/subscriberOrgsTable';
import * as mailer from '../../helpers/mailer';

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
   const coupon = paymentData.promocode || null;
   let stripeResponse;

   try {
      const customer = await stripe.customers.create({
         email: customerEmail,
         description: paymentData.name,
         metadata: {
            address: paymentData.address_line1,
            city: paymentData.address_city
         },
         source: token
      });

      const subscriptions = await stripe.plans.list();
      let selectedPlanId, yearPlanId, monthPlanId;

      subscriptions.data.map(subs => {
         if (subs.interval === 'year' && !subs.trial_period_days) {
            yearPlanId = subs.id;
         } else if (subs.interval === 'month' && !subs.trial_period_days) {
            monthPlanId = subs.id;
         }
      });


      if (paymentData.subscriptionType === 'month') {
         selectedPlanId = monthPlanId;
      } else if (paymentData.subscriptionType === 'year') {
         selectedPlanId = yearPlanId;
      }

      stripeResponse = await stripe.subscriptions.create({
               customer: customer.id,
               coupon: coupon,
               items: [
                  {
                     plan: selectedPlanId,
                     quantity: paymentData.users
                  }
               ]
            });

      return stripeResponse;

   } catch (err) {
      if (typeof err.code !=='undefined' && err.code ==='coupon_expired'){
         throw new CouponExpiredError(coupon);
      }
      // This is where you handle declines and errors.
      // For the demo we simply set to failed.
      return Promise.reject(err);
   }
};

export const getCoupons = async (req, res) => {
   try {
      return await stripe.coupons.list();
   } catch (err) {
      // This is where you handle declines and errors.
      // For the demo we simply set to failed.
      return Promise.reject(err);
   }
};

export const updateSubscription = async (req, res, next) => {
   const subscriptionUpdateData = req.body;
   const subscriptionId = subscriptionUpdateData.subscriptionId;
   const subscriberOrgId = subscriptionUpdateData.subscriberOrgId;
   const coupon = subscriptionUpdateData.promocode || null;
   let stripeResponse;

   try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionUpdateData.subscriptionId);
      const subscriptions = await stripe.plans.list();
      let selectedPlanId, yearPlanId, monthPlanId;
      const userLimit = subscriptionUpdateData.users;

      if ('token' in subscriptionUpdateData && 'customerId' in subscriptionUpdateData) {
         stripeResponse = await stripe.customers.update(subscriptionUpdateData.customerId, {
            source: subscriptionUpdateData.token
          });
      }

      subscriptions.data.map(subs => {
         if (subs.interval === 'year' && !subs.trial_period_days) {
            yearPlanId = subs.id;
         } else if (subs.interval === 'month' && !subs.trial_period_days) {
            monthPlanId = subs.id;
         }
      });

      if (subscriptionUpdateData.subscriptionType === 'monthly') {
         selectedPlanId = monthPlanId;
      } else if (subscriptionUpdateData.subscriptionType === 'annually') {
         selectedPlanId = yearPlanId;
      }

      if ('cancel_at_period_end' in subscriptionUpdateData && subscriptionUpdateData.cancel_at_period_end === true) {
         stripeResponse = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: subscriptionUpdateData.cancel_at_period_end
         });
      } else {
         stripeResponse = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
            coupon: coupon,
            billing_cycle_anchor: 'now',
            trial_end: 'now',
            prorate: true,
            items: [
               {
                  id: subscription.items.data[0].id,
                  plan: selectedPlanId,
                  quantity: subscriptionUpdateData.users
               }
            ]
         });

         const subscriptionStatus = stripeResponse.status;
         const subscriptionExpireDate = stripeResponse.current_period_end;
         const paypalSubscriptionId = null;

         await subscriberOrgsTable.updateSubscriberOrg(req, subscriberOrgId, { userLimit, paypalSubscriptionId, subscriptionStatus, subscriptionExpireDate });
      }

      return stripeResponse;
   } catch (err) {
      // This is where you handle declines and errors.
      // For the demo we simply set to failed.
      return Promise.reject(err);
   }
};

export const deleteSubscription = async (req, res) => {
   const subscriptionId = req.body.subscriptionId;

   try {
      return await stripe.subscriptions.del(subscriptionId);
   } catch (err) {
      // This is where you handle declines and errors.
      // For the demo we simply set to failed.
      return Promise.reject(err);
   }
};

export const getSubscription = async (req, subscriptionId) => {
   try {
      return await stripe.subscriptions.retrieve(subscriptionId);
   } catch (err) {
      // This is where you handle declines and errors.
      // For the demo we simply set to failed.
      return Promise.reject(err);
   }
};


export const doTrialSubscription = async (req, res, next) => {
   // Subscripber data
   let trialData = req.body;

   // Get customer email
   const customerEmail = trialData.email;

   // validate if email exists
   const existingUser = await usersTable.getUserByEmailAddress(req, customerEmail);
   if (existingUser) {
      throw new SubscriberUserExistsError(customerEmail);
   }

   let stripeResponse;

   try {
      const customer = await stripe.customers.create({
         email: customerEmail,
         description: `${trialData.firstName} ${trialData.lastName}`,
         metadata: {
            address: trialData.address,
            phone: trialData.phone,
            company: trialData.company,
         }
      });

      const subscriptions = await stripe.plans.list();
      let selectedPlanId, yearPlanId, monthPlanId;

      subscriptions.data.map(subs => {
         if (subs.interval === 'year' && !subs.trial_period_days) {
            yearPlanId = subs.id;
         } else if (subs.interval === 'month' && !subs.trial_period_days) {
            monthPlanId = subs.id;
         }
      });


      if (trialData.subscriptionType === 'month') {
         selectedPlanId = monthPlanId;
      } else if (trialData.subscriptionType === 'year') {
         selectedPlanId = yearPlanId;
      }

      const trialDateEnd = moment().add(14, 'days').unix()

      stripeResponse = await stripe.subscriptions.create({
               customer: customer.id,
               items: [
                  {
                     plan: selectedPlanId,
                     quantity: trialData.users
                  }
               ],
               trial_end: trialDateEnd,
               billing_cycle_anchor: trialDateEnd,
            });

      // Send notification to Admin
      mailer.sendNewUserDataToAdmin(trialData);

      return stripeResponse;
   } catch (err) {
      // This is where you handle declines and errors.
      // For the demo we simply set to failed.
      return Promise.reject(err);
   }
};
