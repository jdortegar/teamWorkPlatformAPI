import * as dev from './development';
import * as test from './test';

let defaultConfig = dev;
if (process.env.NODE_ENV === 'test') {
   defaultConfig = test;
}

// Start with default config, then subsequently override with DB properties and environment properties.
const config = {
   appEnv: process.env.NODE_ENV.toLowerCase(),
   apiVersion: 2, // Hard-coded.

   // Start local only.
   aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || defaultConfig.aws.accessKeyId,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || defaultConfig.aws.secretAccessKey,
      awsRegion: process.env.AWS_REGION || defaultConfig.aws.awsRegion
   },

   // neo4j
   neo4j: {
      host: process.env.NEO4J_HOST || defaultConfig.neo4j.host,
      port: process.env.NEO4J_PORT || defaultConfig.neo4j.port,
      user: process.env.NEO4J_USER || defaultConfig.neo4j.user,
      password: process.env.NEO4J_PASSWORD || defaultConfig.neo4j.password
   },

   dynamoDbEndpoint: process.env.DYNAMODB_ENDPOINT || defaultConfig.dynamoDbEndpoint,
   tablePrefix: process.env.TBL_PREFIX || defaultConfig.tablePrefix,
   // End local only.

   cacheServer: process.env.CACHE_SERVER || defaultConfig.cacheServer,
   cachePort: process.env.CACHE_PORT || defaultConfig.cachePort,
   redisPrefix: defaultConfig.redisPrefix,

   nodePort: process.env.NODE_PORT || defaultConfig.nodePort,
   aesKey: process.env.AES_KEY || defaultConfig.aesKey,
   jwtSecret: process.env.JWT_SECRET || defaultConfig.jwtSecret,
   signedCookieSecret: process.env.SIGNED_COOKIE_SECRET || defaultConfig.signedCookieSecret,
   apiEndpoint: process.env.API_ENDPOINT || defaultConfig.apiEndpoint,

   webappBaseUri: process.env.WEBAPP_BASE_URI || defaultConfig.webappBaseUri,
   resourcesBaseUrl: process.env.RESOURCES_BASE_URL || defaultConfig.resourcesBaseUrl,

   awsProductCode: process.env.AWS_PRODUCT_CODE || defaultConfig.awsProductCode,

   /**
    * 'error', 'warn', 'info', 'verbose', 'debug', 'silly'.
    */
   loggerLevel: process.env.LOGGER_LEVEL || defaultConfig.loggerLevel,

   /**
    * Output logs in JSON (true) or not (false).
    */
   loggerJson: process.env.LOGGER_JSON || defaultConfig.loggerJson,

   boxClientId: process.env.BOX_CLIENT_ID || defaultConfig.boxClientId,
   boxClientSecret: process.env.BOX_CLIENT_SECRET || defaultConfig.boxClientSecret,
   boxWebhooksPrimaryKey: process.env.BOX_WEBHOOKS_PRIMARY_KEY || defaultConfig.boxWebhooksPrimaryKey,
   boxWebhooksSecondaryKey: process.env.BOX_WEBHOOKS_SECONDARY_KEY || defaultConfig.boxWebhooksSecondaryKey,

   googleClientId: process.env.GOOGLE_CLIENT_ID || defaultConfig.googleClientId,
   googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || defaultConfig.googleClientSecret,

   sharepointClientId: process.env.SHAREPOINT_CLIENT_ID || defaultConfig.sharepointClientId,
   sharepointClientSecret: process.env.SHAREPOINT_CLIENT_SECRET || defaultConfig.sharepointClientSecret,

   onedriveClientId: process.env.ONEDRIVE_CLIENT_ID || defaultConfig.onedriveClientId,
   onedriveClientSecret: process.env.ONEDRIVE_CLIENT_SECRET || defaultConfig.onedriveClientSecret,

   salesforceClientId: process.env.SALESFORCE_CLIENT_ID || defaultConfig.salesforceClientId,
   salesforceClientSecret: process.env.SALESFORCE_CLIENT_SECRET || defaultConfig.salesforceClientSecret,

   dropboxClientId: process.env.DROPBOX_CLIENT_ID || defaultConfig.dropboxClientId,
   dropboxClientSecret: process.env.DROPBOX_CLIENT_SECRET || defaultConfig.dropboxClientSecret,
   redshift: {
      user: process.env.REDSHIFT_USER || defaultConfig.redshift.user,
      database: process.env.REDSHIFT_DATABASE || defaultConfig.redshift.database,
      password: process.env.REDSHIFT_PASSWORD || defaultConfig.redshift.password,
      host: process.env.REDSHIFT_HOST || defaultConfig.redshift.host,
      port: process.env.REDSHIFT_PORT || defaultConfig.redshift.port
   },
   surveyTable: process.env.SURVEY_TABLE || defaultConfig.surveyTable,

   // stripeConfig: defaultConfig.stripeConfig,
   stripeConfig: {
      country: 'US',
      currency: 'usd',
      stripe: {
         country: 'US',
         apiVersion: '2018-10-31',
         publishableKey: process.env.STRIPE_PUBLIC_KEY || defaultConfig.stripeConfig.stripe.publishableKey,
         secretKey: process.env.STRIPE_SECRET_KEY || defaultConfig.stripeConfig.stripe.secretKey
      }
   },

   paypalConfig: {
      mode: process.env.mode || defaultConfig.paypalConfig.mode,
      clientId: process.env.CLIENT_ID || defaultConfig.paypalConfig.clientId,
      clientSecret: process.env.CLIENT_SECRET || defaultConfig.paypalConfig.clientSecret
   },

   knowledgeApiEndpoint: process.env.KNOWLEDGE_API || defaultConfig.knowledgeApiEndpoint,

   notificationEmail: process.env.NOTIFICATION_EMAIL ||defaultConfig.notificationEmail
};

export const applyPropertiesFromDbToConfig = propertiesFromDb => {
   propertiesFromDb.forEach(property => {
      config[property.propertyName] = property.propertyValue;
   });
   return Promise.resolve();
};

export const applyEnvironmentToConfig = () => {
   config.aws.accessKeyId = process.env.AWS_ACCESS_KEY_ID || config.aws.accessKeyId;
   config.aws.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || config.aws.secretAccessKey;
   config.aws.awsRegion = process.env.AWS_REGION || config.aws.awsRegion;

   config.dynamoDbEndpoint = process.env.DYNAMODB_ENDPOINT || config.dynamoDbEndpoint;
   config.tablePrefix = process.env.TBL_PREFIX || config.tablePrefix;

   config.cacheServer = process.env.CACHE_SERVER || config.cacheServer;
   config.cachePort = process.env.CACHE_PORT || config.cachePort;
   config.redisPrefix = process.env.REDIS_PREFIX || config.redisPrefix;

   config.nodePort = process.env.NODE_PORT || config.nodePort;
   config.aesKey = process.env.AES_KEY || config.aesKey;
   config.jwtSecret = process.env.JWT_SECRET || config.jwtSecret;
   config.signedCookieSecret = process.env.SIGNED_COOKIE_SECRET || config.signedCookieSecret;
   config.apiEndpoint = process.env.API_ENDPOINT || config.apiEndpoint;

   config.webappBaseUri = process.env.WEBAPP_BASE_URI || config.webappBaseUri;
   config.resourcesBaseUrl = process.env.RESOURCES_BASE_URL || config.resourcesBaseUrl;

   config.awsProductCode = process.env.AWS_PRODUCT_CODE || config.awsProductCode;

   /**
    * 'error', 'warn', 'info', 'verbose', 'debug', 'silly'.
    */
   config.loggerLevel = process.env.LOGGER_LEVEL || config.loggerLevel;

   /**
    * Output logs in JSON (true) or not (false).
    */
   config.loggerJson = process.env.LOGGER_JSON || config.loggerJson;

   config.boxClientId = process.env.BOX_CLIENT_ID || config.boxClientId;
   config.boxClientSecret = process.env.BOX_CLIENT_SECRET || config.boxClientSecret;
   config.boxWebhooksPrimaryKey = process.env.BOX_WEBHOOKS_PRIMARY_KEY || config.boxWebhooksPrimaryKey;
   config.boxWebhooksSecondaryKey = process.env.BOX_WEBHOOKS_SECONDARY_KEY || config.boxWebhooksSecondaryKey;

   config.googleClientId = process.env.GOOGLE_CLIENT_ID || config.googleClientId;
   config.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || config.googleClientSecret;

   config.sharepointClientId = process.env.SHAREPOINT_CLIENT_ID || config.sharepointClientId;
   config.sharepointClientSecret = process.env.SHAREPOINT_CLIENT_SECRET || config.sharepointClientSecret;

   config.onedriveClientId = process.env.ONEDRIVE_CLIENT_ID || config.onedriveClientId;
   config.onedriveClientSecret = process.env.ONEDRIVE_CLIENT_ID || config.onedriveClientSecret;

   config.salesforceClientId = process.env.ONEDRIVE_CLIENT_ID || config.salesforceClientId;
   config.salesforceClientSecret = process.env.ONEDRIVE_CLIENT_ID || config.salesforceClientSecret;

   config.dropboxClientId = process.env.DROPBOX_CLIENT_ID || config.dropboxClientId;
   config.dropboxClientSecret = process.env.DROPBOX_CLIENT_SECRET || config.dropboxClientSecret;



   return Promise.resolve();
};

export default config;
