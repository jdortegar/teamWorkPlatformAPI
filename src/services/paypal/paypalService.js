// Paypal service for billing
import config from '../../config/env';
import { SubscriberUserExistsError, CancelSubscriptionError } from '../../services/errors';
import * as usersTable from '../../repositories/db/usersTable';
import * as subscriberOrgsTable from '../../repositories/db/subscriberOrgsTable';
import paypal from 'paypal-rest-sdk';
import * as userSvc from '../../services/userService';

// Paypal Setup (Mode and Credentials)

paypal.configure({
   mode: config.paypalConfig.mode,
   client_id: config.paypalConfig.clientId,
   client_secret: config.paypalConfig.clientSecret
});

// Make Promise for handle async Paypal create subscriptions
const subscriptionPromise = (req, paymentData) => {
   const { billingPlanAttributes, userLimit } = paymentData;

   return new Promise((resolve, reject) => {
      paypal.billingPlan.create(billingPlanAttributes, function (error, billingPlan) {
         if (error) {
            return reject(error);
         }

         // Activate the plan by changing status to Active

         // JSON object for active plan
         const billingPlanUpdateAttributes = [
            {
               op: 'replace',
               path: '/',
               value: {
                  state: 'ACTIVE'
               }
            }
         ];

         paypal.billingPlan.update(billingPlan.id, billingPlanUpdateAttributes, function (error, response) {
            if (error) {
               return reject(error);
            }

            // Create Agreement

            const isoDate = new Date();
            isoDate.setSeconds(isoDate.getSeconds() + 4);
            isoDate.toISOString().slice(0, 19) + 'Z';

            const billingAgreementAttributes = {
               name: billingPlan.name,
               description: billingPlan.description,
               start_date: isoDate,
               plan: {
                  id: billingPlan.id
               },
               payer: {
                  payment_method: 'paypal'
               }
            };

            paypal.billingAgreement.create(billingAgreementAttributes, function (error, billingAgreement) {
               if (error) {
                  return reject(error);
               }

               //capture HATEOAS links
               const links = {};
               billingAgreement.links.forEach(function (linkObj) {
                  links[linkObj.rel] = {
                     href: linkObj.href,
                     method: linkObj.method
                  };
               });

               //if redirect url present, redirect user
               if (links.hasOwnProperty('approval_url')) {
                  const approval_url = links['approval_url'].href;
                  const token = approval_url.split('token=', 2).pop();

                  // save Data on Redis until process Agreement
                  req.app.locals.redis.hmset(
                     `${config.redisPrefix}#paypal#${token}`,
                     'userLimit',
                     userLimit,
                     'EX',
                     5000
                  );

                  return resolve(approval_url);
               }

               resolve('no redirect URI present');
            });
         });

      });
   });
};

// Create Subcription Plans
export const doSubscription = async (req, res, next) => {
   // Subscriber data
   const paymentData = req.body;

   try {
      const paypalResponse = await subscriptionPromise(req, paymentData);
      return paypalResponse;
   } catch (err) {
      return Promise.reject(err);
   }
};

// Process agreement

const processAgreementPromise = (req, token) => {
   return new Promise((resolve, reject) => {
      paypal.billingAgreement.execute(token, {}, async (error, billingAgreement) => {
         if (error) {
            return reject(error);
         }

         req.app.locals.redis.hgetall(`${config.redisPrefix}#paypal#${token}`, async (err, reply) => {
            if (err) {
               req.logger.debug('validateEmail: get status - redis error');
               return reject(err);
            }

            if (reply) {

               const { email } = billingAgreement.payer.payer_info;
               const { userLimit } = reply;
               const paypalSubscriptionId = billingAgreement.id

               const userSubscriptionData = {
                  email,
                  userLimit,
                  paypalSubscriptionId,
                  subscriptionStatus: billingAgreement.state,
                  subscriptionExpireDate: billingAgreement.agreement_details.next_billing_date
               };

               // validate if email exists
               const existingUser = await usersTable.getUserByEmailAddress(req, email);

               if (existingUser) {
                  const { orgId } = req.query;
                  const updateOrg = await subscriberOrgsTable.updateSubscriberOrg(req, orgId, { userLimit, paypalSubscriptionId });
                  return resolve(billingAgreement);
               }

               const createReservation = userSvc.createReservation(req, userSubscriptionData);
               resolve(billingAgreement);
            }
         });
      });
   });
};

export const processAgreement = async (req, res, next) => {
   const { token } = req.query;
   try {
      const paypalResponse = await processAgreementPromise(req, token);
      return paypalResponse;
   } catch (err) {
      return Promise.reject(err);
   }
};

// Cancel agreement

const cancelPromise = billingAgreementId => {
   return new Promise((resolve, reject) => {
      const cancel_note = {
         note: 'Canceling the agreement'
      };

      paypal.billingAgreement.suspend(billingAgreementId, cancel_note, function (error, response) {
         if (error) {
            if (error.httpStatusCode !== '400') {
               return reject(new CancelSubscriptionError());
            }
            return reject(error);
         }
         paypal.billingAgreement.get(billingAgreementId, function (error, billingAgreement) {
            if (error) {
               return reject(error);
            }

            resolve(billingAgreement);

         });
      });
   });
};

export const cancelAgreement = async (req, res, next) => {
   const billingAgreementId = req.query.agreement;

   try {
      const paypalResponse = await cancelPromise(billingAgreementId);
      return paypalResponse;
   } catch (err) {
      return Promise.reject(err);
   }
};

// Update Agreement

const updatePromise = (billingAgreementId, billing_agreement_update_attributes) => {
   return new Promise((resolve, reject) => {
      paypal.billingAgreement.get(billingAgreementId, function (error, billingAgreement) {
         if (error) {
            return reject(error);
         }

         paypal.billingAgreement.update(billingAgreementId, billing_agreement_update_attributes, function (
            error,
            response
         ) {
            if (error) {
               return reject(error);
            }

            resolve(response);
         });
      });
   });
};

export const updateAgreement = async (req, res, next) => {
   const { billingAgreementId } = req.body;

   const { billing_agreement_update_attributes } = req.body;

   try {
      const paypalResponse = await updatePromise(billingAgreementId, billing_agreement_update_attributes);
      return paypalResponse;
   } catch (err) {
      return Promise.reject(err);
   }
};

// Get subscription

const getAgreementPromise = billingAgreementId => {
   return new Promise((resolve, reject) => {
      paypal.billingAgreement.get(billingAgreementId, function (error, billingAgreement) {
         if (error) {
            return reject(error);
         }

         resolve(billingAgreement);
      });
   });
};

export const getAgreement = async (req, res, next) => {
   const billingAgreementId = req.query.agreement;

   try {
      const paypalResponse = await getAgreementPromise(billingAgreementId);
      return paypalResponse;
   } catch (err) {
      return Promise.reject(err);
   }
};
