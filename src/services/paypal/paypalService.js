// Paypal service for billing
import config from '../../config/env';
import { SubscriberUserExistsError } from '../../services/errors';
import * as usersTable from '../../repositories/db/usersTable';
import * as subscriberOrgsTable from '../../repositories/db/subscriberOrgsTable';
import paypal from 'paypal-rest-sdk';
import createReservation from '../../controllers/users'

// Paypal Setup (Mode and Credentials)

paypal.configure({
   mode: config.paypalConfig.mode,
   client_id: config.paypalConfig.clientId,
   client_secret: config.paypalConfig.clientSecret
});

// Make Promise for handle async Paypal create subscriptions
const subscriptionPromise = billingPlanAttributes => {
   return new Promise((resolve, reject) => {

      paypal.billingPlan.create(billingPlanAttributes, function (error, billingPlan) {
         if (error) {
            return reject(error);
         } else {
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
               } else {

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
                        console.error(error.response.details);
                        return reject(error);
                     } else {
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
                           return resolve(links['approval_url'].href);
                        } else {
                           resolve('no redirect URI present');
                        }
                     }
                  });
               }
            });
         }
      });
   });
};

// Create Subcription Plans
export const doSubscription = async (req, res, next) => {
   // Subscriber data
   let paymentData = req.body;
   // Get customer email
   const customerEmail = paymentData.email;
   const { billingPlanAttributes } = paymentData;

   // validate if email exists
   const existingUser = await usersTable.getUserByEmailAddress(req, customerEmail);
   if (existingUser) {
      throw new SubscriberUserExistsError(customerEmail);
   }

   try {
      const paypalResponse = await subscriptionPromise(billingPlanAttributes);
      return paypalResponse;
   } catch (err) {
      return Promise.reject(err);
   }
};


// Make Promise for handle async Paypal create subscriptions
const createPlanPromise = billingPlanAttributes => {
   return new Promise((resolve, reject) => {

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

      paypal.billingPlan.create(billingPlanAttributes, function (error, billingPlan) {
         if (error) {
            return reject(error);
         } else {
            // Activate the plan by changing status to Active
            paypal.billingPlan.update(billingPlan.id, billingPlanUpdateAttributes, function (error, response) {
               if (error) {
                  return reject(error);
               } else {
                  return resolve(billingPlan);
               }
            });
         }
      });
   });
};

// Create Paypal Plan

export const createPlan = async (req, res, next) => {
   // Subscriber data
   let paymentData = req.body;
   // Get customer email
   const customerEmail = paymentData.email;
   const { billingPlanAttributes } = paymentData;

   // validate if email exists
   const existingUser = await usersTable.getUserByEmailAddress(req, customerEmail);
   if (existingUser) {
      throw new SubscriberUserExistsError(customerEmail);
   }

   try {
      const paypalResponse = await createPlanPromise(billingPlanAttributes);
      return paypalResponse;
   } catch (err) {
      return Promise.reject(err);
   }
};

// Create Agreement

const createAgreementPromise = billingPlanId => {
   return new Promise((resolve, reject) => {
      paypal.billingPlan.get(billingPlanId, function (error, billingPlan) {
         if (error) {
            return reject(error);
         } else {

            const isoDate = new Date();
            isoDate.setSeconds(isoDate.getSeconds() + 4);
            isoDate.toISOString().slice(0, 19) + 'Z';

            const billingAgreementAttributes = {
               name: billingPlan.name,
               description: billingPlan.description,
               start_date: isoDate,
               plan: {
                  id: billingPlanId
               },
               payer: {
                  payment_method: 'paypal'
               }
            };

            paypal.billingAgreement.create(billingAgreementAttributes, function (error, billingAgreement) {
               if (error) {
                  console.error(error.response.details);
                  return reject(error);
               } else {
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
                     return resolve(links['approval_url'].href);
                  } else {
                     resolve('no redirect URI present');
                  }
               }
            });
         }
      });
   });
};

export const createAgreement = async (req, res, next) => {
   const billingPlanId = req.query.plan;

   try {
      const paypalResponse = await createAgreementPromise(billingPlanId);
      return paypalResponse;
   } catch (err) {
      return Promise.reject(err);
   }
};

// Process agreement

const processAgreementPromise = token => {
   return new Promise((resolve, reject) => {
      paypal.billingAgreement.execute(token, {}, function (error, billingAgreement) {
         if (error) {
            return reject(error);
         } else {
            resolve(billingAgreement);

            const userSubscriptionData = {
               email: formData.email,
               userLimit: formData.users,
               subscriptionId: billingAgreement.id,
               subscriptionStatus: billingAgreement.state,
               subscriptionExpireDate: data.current_period_end
             };


         }
      });
   });
};

export const processAgreement = async (req, res, next) => {
   const token = req.query.token;
   try {
      const paypalResponse = await processAgreementPromise(token);
      return paypalResponse;
   } catch (err) {
      return Promise.reject(err);
   }
};

// Cancel agreement

const cancelPromise = billingAgreementId => {
   return new Promise((resolve, reject) => {
      var cancel_note = {
         note: 'Canceling the agreement'
      };

      paypal.billingAgreement.cancel(billingAgreementId, cancel_note, function (error, response) {
         if (error) {
            return reject(error);
         } else {
            paypal.billingAgreement.get(billingAgreementId, function (error, billingAgreement) {
               if (error) {
                  return reject(error);
               } else {
                  resolve(billingAgreement);
               }
            });
         }
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
         } else {
            paypal.billingAgreement.update(billingAgreementId, billing_agreement_update_attributes, function (
               error,
               response
            ) {
               if (error) {
                  return reject(error);
               } else {
                  resolve(response);
               }
            });
         }
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
