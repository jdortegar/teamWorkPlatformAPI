import AWS from 'aws-sdk';
import moment from 'moment';
import cron from 'node-cron';
import config from '../config/env';
import app from '../config/express';
import * as awsMarketplaceCustomersRepo from '../repositories/awsMarketplaceCustomersRepo';
import { getUserSubscriberOrgs, updateSubscriberOrg } from './subscriberOrgService';
import { InvalidAwsProductCodeError, CustomerExistsError } from './errors';

const getCachedByteCount = (req, subscriberOrgId) => {
   return req.app.locals.redis.getAsync(`${config.redisPrefix}${subscriberOrgId}#bytesUsed`);
};

const setCachedByteCount = (req, subscriberOrgId, value) => {
   return req.app.locals.redis.setAsync(`${config.redisPrefix}${subscriberOrgId}#bytesUsed`, value);
};

export const updateCachedByteCount = (req, subscriberOrgId, addValue) => {
   return req.app.locals.redis.incrbyAsync(`${config.redisPrefix}${subscriberOrgId}#bytesUsed`, addValue);
};


export const ensureCachedByteCountExists = (req) => {
   console.log('Ensure cached byte count exists for customers.');
   return new Promise((resolve, reject) => {
      let subscriberOrgId;

      awsMarketplaceCustomersRepo.getAllCustomers(req)
         .then((customers) => {
            const promises = [];
            customers.forEach((customer) => {
               promises.push(getCachedByteCount(req, customer.subscriberOrgId)
                  .then((cachedByteCount) => {
                     if ((!cachedByteCount) || (cachedByteCount === null)) {
                        setCachedByteCount(req, customer.subscriberOrgId, customer.currentGB);
                     }
                  })
                  .catch(err => console.error(`Error ensureCachedByteCountExists for subscriberOrgId=${subscriberOrgId}:  ${err}`))
               );
            });
            return Promise.all(promises);
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
};


export const resolveCustomer = (req, amznMarketplaceToken) => {
   return new Promise((resolve, reject) => {
      const marketplaceMetering = new AWS.MarketplaceMetering();
      marketplaceMetering.resolveCustomer({ RegistrationToken: amznMarketplaceToken }).promise()
      // Promise.resolve({ CustomerIdentifier: amznMarketplaceToken, ProductCode: config.awsProductCode }) // TODO: remove
         .then((data) => {
            const { CustomerIdentifier, ProductCode } = data;
            if (ProductCode !== config.awsProductCode) {
               throw new InvalidAwsProductCodeError(ProductCode);
            }
            resolve(CustomerIdentifier);
         })
         .catch(err => reject(err));
   });
};

const getEntitlements = (req, productCode, customerIdentifier = undefined) => {
   return new Promise((resolve, reject) => {
      // Marketplace Entitle Service currently only available in us-east-1.
      const marketplaceEntitlement = new AWS.MarketplaceEntitlementService({ region: 'us-east-1' });
      const params = { ProductCode: productCode };
      if (customerIdentifier) {
         params.Filter = {
            CUSTOMER_IDENTIFIER: [customerIdentifier]
         };
      }
      marketplaceEntitlement.getEntitlements(params).promise()
         .then((data) => {
            const { Entitlements: entitlements } = data;
            if ((!entitlements) || (entitlements.length === 0)) {
               resolve();
            } else {
               resolve(entitlements);
            }
         })
         .catch(err => reject(err));
   });
};

const parseEntitlementsForLatest = (entitlements) => {
   const { ExpirationDate: expiration, ProductCode: awsProductCode, Value: { IntegerValue: maxUsers } } = entitlements.reduce((prevVal, entitlement) => {
      if (!prevVal) {
         return entitlement;
      }
      return (entitlement.ExpirationDate > prevVal.ExpirationDate) ? entitlement : prevVal;
   }, undefined);
   return { expiration, awsProductCode, maxUsers };
};

export const registerCustomer = (req, awsCustomerId, user) => {
   return new Promise((resolve, reject) => {
      let subscriberOrg;
      awsMarketplaceCustomersRepo.getCustomer(req, awsCustomerId)
         .then((customer) => {
            if (customer) {
               throw new CustomerExistsError(awsCustomerId);
            }

            return Promise.all([
               getEntitlements(req, config.awsProductCode, awsCustomerId),
               // Promise.resolve({ Entitlements: [{ ExpirationDate: "today", ProductCode: config.awsProductCode, Value: { IntegerValue: 15 } }]}), // TODO: remove
               getUserSubscriberOrgs(req, user.userId)
            ]);
         })
         .then((promises) => {
            const entitlements = promises[0];
            subscriberOrg = promises[1][0];

            const { subscriberOrgId } = subscriberOrg;
            const { expiration, awsProductCode, maxUsers } = parseEntitlementsForLatest(entitlements);
            const maxGB = 5;
            return awsMarketplaceCustomersRepo.createCustomer(req, subscriberOrgId, awsCustomerId, awsProductCode, entitlements, expiration, maxUsers, 1, maxGB, 0);
         })
         .then(() => updateSubscriberOrg(req, subscriberOrg.subscriberOrgId, { awsCustomerId }, user.userId))
         .then(() => setCachedByteCount(req, subscriberOrg.subscriberOrgId, 0))
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

/**
 * {
 *   "action": "subscribe-success",
 *   "customer-identifier": "T1VJRC0xMjM0MTIzNDEyMzQtNTY3ODU2ODc1Nj",
 *   "product-code": "72m8mmj6t2dgb8dfscnpsbfmn"
 * }
 * @param req
 * @param event
 * @returns {Promise}
 */
export const updateCustomerEntitlements = (req, message) => {
   return new Promise((resolve, reject) => {
      console.log(`AD: updateCustomerEntitlements: ${JSON.stringify(message)}`);
      // if (message.action === 'entitlement-updated'
      // const { awsProductCode, awsCustomerId } = ..
      // else if (message.action === 'unsubscribe-pending') || (message.action === 'unsubscriber-success')) {.
      resolve(); // TODO: what to do with this event.
   });
};

const updateCustomerFromEntitlements = (req, customer) => {
   return new Promise((resolve, reject) => {
      const { awsCustomerId } = customer;
      getEntitlements(req, customer.awsProductCode, awsCustomerId)
         .then((entitlements) => {
            const { expiration, maxUsers } = parseEntitlementsForLatest(entitlements);
            const maxGB = 5;
            return awsMarketplaceCustomersRepo.updateCustomer(req, awsCustomerId, {
               entitlements,
               expiration,
               maxUsers,
               maxGB
            });
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

const syncAllCustomerEntitlements = (req) => {
   return new Promise((resolve, reject) => {
      awsMarketplaceCustomersRepo.getAllCustomers(req)
         .then((customers) => {
            const promises = [];
            customers.forEach(customer => promises.push(updateCustomerFromEntitlements(req, customer)));
            if (promises.length > 0) {
               return Promise.all(promises);
            }
            return undefined;
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
};


/**
 * Update customer entitlements every midnight.
 */
export const startCronUpdateCustomerEntitlements = () => {
   console.log('Starting Cron to update AWS Marketplace customer entitlements every midnight.');
   cron.schedule('0 0 0 * * *', () => {
      console.log('Updating customer entitlements...'); // eslint-disable-line no-console
      const req = { app, now: moment.utc() };
      syncAllCustomerEntitlements(req);
   });
};
