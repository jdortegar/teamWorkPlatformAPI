const config = {
    appEnv: process.env.NODE_ENV.toLowerCase(),

    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        awsRegion: process.env.AWS_REGION
    },

    neo4j: {
        host: process.env.NEO4J_HOST,
        port: process.env.NEO4J_PORT,
        user: process.env.NEO4J_USER,
        password: process.env.NEO4J_PASSWORD,
    },

    dynamoDbEndpoint: process.env.DYNAMODB_ENDPOINT,
    tablePrefix: process.env.TBL_PREFIX,
    cacheServer: process.env.CACHE_SERVER,
    cachePort: process.env.CACHE_PORT,
    redisPrefix: process.env.CACHE_PREFIX,
    nodePort: process.env.NODE_PORT,
   aesKey: process.env.AES_KEY,
   jwtSecret: process.env.JWT_SECRET,
   signedCookieSecret: process.env.SIGNED_COOKIE_SECRET,
   apiEndpoint: process.env.API_ENDPOINT,

   webappBaseUri: process.env.WEBAPP_BASE_URI,
   resourcesBaseUrl: process.env.RESOURCES_BASE_URL,

   awsProductCode: process.env.AWS_PRODUCT_CODE,

   /**
    * 'error', 'warn', 'info', 'verbose', 'debug', 'silly'.
    */
   loggerLevel: process.env.LOGGER_LEVEL,

   /**
    * Output logs in JSON (true) or not (false).
    */
   loggerJson: process.env.LOGGER_JSON,

   boxClientId: process.env.BOX_CLIENT_ID,
   boxClientSecret: process.env.BOX_CLIENT_SECRET,
   boxWebhooksPrimaryKey: process.env.BOX_WEBHOOKS_PRIMARY_KEY,
   boxWebhooksSecondaryKey: process.env.BOX_WEBHOOKS_SECONDARY_KEY,

   googleClientId: process.env.GOOGLE_CLIENT_ID,
   googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,

   sharepointClientId: process.env.SHAREPOINT_CLIENT_ID,
   sharepointClientSecret: process.env.SHAREPOINT_CLIENT_SECRET,

   onedriveClientId: process.env.ONEDRIVE_CLIENT_ID,
   onedriveClientSecret: process.env.ONEDRIVE_CLIENT_SECRET,

   salesforceClientId: process.env.SALESFORCE_CLIENT_ID,
   salesforceClientSecret: process.env.SALESFORCE_CLIENT_SECRET,

   dropboxClientId: process.env.DROPBOX_CLIENT_ID,
   dropboxClientSecret: process.env.DROPBOX_CLIENT_SECRET,
   redshift: {
      user: process.env.REDSHIFT_USER,
      database: process.env.REDSHIFT_DATABASE,
      password: process.env.REDSHIFT_PASSWORD,
      host: process.env.REDSHIFT_HOST,
      port: process.env.REDSHIFT_PORT
   }
}
export default config;
