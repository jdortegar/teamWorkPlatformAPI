import AWS from 'aws-sdk';
import cron from 'node-cron';
import config from '../config/env';
import * as table from '../repositories/db/awsMarketplaceCustomersTable';
import { getUserSubscriberOrgs, updateSubscriberOrg } from './subscriberOrgService';
import { InvalidAwsProductCodeError, CustomerExistsError, CustomerNotExistError } from './errors';
import { createPseudoRequest } from '../logger';

const getCachedByteCount = (req, subscriberOrgId) => {
   return req.app.locals.redis.getAsync(`${config.redisPrefix}${subscriberOrgId}#bytesUsed`);
};

const setCachedByteCount = (req, subscriberOrgId, value) => {
   return req.app.locals.redis.setAsync(`${config.redisPrefix}${subscriberOrgId}#bytesUsed`, value);
};

export const updateCachedByteCount = (req, subscriberOrgId, addValue) => {
   return new Promise((resolve) => {
      req.app.locals.redis.incrbyAsync(`${config.redisPrefix}${subscriberOrgId}#bytesUsed`, addValue)
         .then(() => resolve())
         .catch(() => resolve()); // Ignore.  Just means this org's usage is not being monitored.
   });
};


export const ensureCachedByteCountExists = (req) => {
   return new Promise((resolve, reject) => {
      let subscriberOrgId;

      table.getAllCustomers(req)
         .then((customers) => {
            const promises = [];
            customers.forEach((customer) => {
               promises.push(getCachedByteCount(req, customer.subscriberOrgId)
                  .then((cachedByteCount) => {
                     if ((!cachedByteCount) || (cachedByteCount === null)) {
                        setCachedByteCount(req, customer.subscriberOrgId, customer.currentGB);
                     }
                  })
                  .catch(err => req.logger.error(`Error ensureCachedByteCountExists for subscriberOrgId=${subscriberOrgId}:  ${err}`))
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
      const marketplaceEntitlement = new AWS.MarketplaceEntitlementService({ region: 'https://entitlement.marketplace.us-east-1.amazonaws.com' });
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
      table.getCustomer(req, awsCustomerId)
         .then((customer) => {
            if (customer) {
               throw new CustomerExistsError(awsCustomerId);
            }

            return Promise.all([
               getEntitlements(req, config.awsProductCode, awsCustomerId),
               getUserSubscriberOrgs(req, user.userId)
            ]);
         })
         .then((promises) => {
            const entitlements = promises[0].Entitlements;
            subscriberOrg = promises[1][0];

            const { subscriberOrgId } = subscriberOrg;
            const { expiration, awsProductCode, maxUsers } = parseEntitlementsForLatest(entitlements);
            const maxGB = 5;
            return table.createCustomer(req, subscriberOrgId, awsCustomerId, awsProductCode, entitlements, expiration, maxUsers, 1, maxGB, 0);
         })
         .then(() => updateSubscriberOrg(req, subscriberOrg.subscriberOrgId, { awsCustomerId }, user.userId))
         .then(() => setCachedByteCount(req, subscriberOrg.subscriberOrgId, 0))
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

const updateCustomerFromEntitlements = (req, customer) => {
   return new Promise((resolve, reject) => {
      const { awsCustomerId } = customer;
      getEntitlements(req, customer.awsProductCode, awsCustomerId)
         .then((entitlements) => {
            const { expiration, maxUsers } = parseEntitlementsForLatest(entitlements);
            const maxGB = 5;
            return table.updateCustomer(req, awsCustomerId, {
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
      req.logger.info(`updateCustomerEntitlements: ${JSON.stringify(message)}`);
      const action = message.action;
      const awsCustomerId = message['customer-identifier'];
      const awsProductCode = message['product-code']; // eslint-disable-line no-unused-vars
      if ((action === 'entitlement-updated') || (action === 'unsubscribe-pending') || (action === 'unsubscriber-success')) {
         table.getCustomer(req, awsCustomerId)
            .then((customer) => {
               if ((!customer) || (customer === null)) {
                  throw new CustomerNotExistError(awsCustomerId);
               } else {
                  updateCustomerFromEntitlements(req, customer)
                     .catch((err) => { throw err; });
               }
            })
            .catch((err) => {
               req.logger.error({ error: err }, `updateCustomerEntitlements failed for awsCustomerId=${awsCustomerId}`);
               reject(err);
            });
      }
      resolve();
   });
};

const syncAllCustomerEntitlements = (req) => {
   return new Promise((resolve, reject) => {
      table.getAllCustomers(req)
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


const lockEnsureUpdateCustomerEntitlements = (req) => {
   return new Promise((resolve, reject) => {
      req.app.locals.redis.setAsync(`${config.redisPrefix}updateCustomerEntitlementsLock`, true, 'NX', 'EX', 120) // Expire in 2 minutes.
         .then((response) => { resolve(response === 'OK'); })
         .catch(err => reject(err));
   });
};

const unlockEnsureUpdateCustomerEntitlements = (req) => {
   return req.app.locals.redis.delAsync(`${config.redisPrefix}updateCustomerEntitlementsLock`);
};

/**
 * Update customer entitlements every midnight.
 */
export const startCronUpdateCustomerEntitlements = () => {
   createPseudoRequest().logger.info('Starting Cron to update AWS Marketplace customer entitlements every midnight.');
   // cron.schedule('0 0 0 * * *', () => {
   cron.schedule('0 * * * * *', () => {
      const req = createPseudoRequest();
      lockEnsureUpdateCustomerEntitlements(req)
         .then((locked) => {
            if (locked) {
               req.logger.info('Updating customer entitlements...');
               return syncAllCustomerEntitlements(req);
            }
            return undefined;
         })
         .then(() => unlockEnsureUpdateCustomerEntitlements(req))
         .catch((err) => {
            unlockEnsureUpdateCustomerEntitlements(req);
            req.logger.error(err);
         });
   });
};
