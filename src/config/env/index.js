import * as dev from './development';
import * as test from './test';

let defaultConfig = dev;
if (process.env.NODE_ENV === 'test') {
   defaultConfig = test;
}

// Start with default config, then subsequently override with DB properties and environment properties.
const config = {
   apiVersion: 1, // Hard-coded.

   // Start local only.
   aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || defaultConfig.aws.accessKeyId,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || defaultConfig.aws.secretAccessKey,
      awsRegion: process.env.AWS_REGION || defaultConfig.aws.awsRegion
   },

   dynamoDbEndpoint: process.env.DYNAMODB_ENDPOINT || defaultConfig.dynamoDbEndpoint,
   tablePrefix: process.env.TBL_PREFIX || defaultConfig.tablePrefix,
   // End local only.

   cacheServer: process.env.CACHE_SERVER || defaultConfig.cacheServer,
   cachePort: process.env.CACHE_PORT || defaultConfig.cachePort,
   redisPrefix: defaultConfig.redisPrefix,

   nodePort: process.env.NODE_PORT || defaultConfig.nodePort,
   jwtSecret: process.env.JWT_SECRET || defaultConfig.jwtSecret,
   signedCookieSecret: process.env.SIGNED_COOKIE_SECRET || defaultConfig.signedCookieSecret,
   aesKey: process.env.AES_KEY || defaultConfig.aesKey,
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
   onedriveClientSecret: process.env.ONEDRIVE_CLIENT_SECRET || defaultConfig.onedriveClientSecret
};

export const applyPropertiesFromDbToConfig = (propertiesFromDb) => {
   propertiesFromDb.forEach((property) => { config[property.propertyName] = property.propertyValue; });
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
   config.jwtSecret = process.env.JWT_SECRET || config.jwtSecret;
   config.signedCookieSecret = process.env.SIGNED_COOKIE_SECRET || config.signedCookieSecret;
   config.aesKey = process.env.AES_KEY || config.aesKey;
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

   return Promise.resolve();
};

export default config;
