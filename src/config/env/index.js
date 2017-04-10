import * as dev from './development';

const config = {
   nodePort: process.env.NODE_PORT || dev.nodePort,
   tablePrefix: process.env.TBL_PREFIX || dev.tablePrefix,
   cacheServer: process.env.CACHE_SERVER || dev.cacheServer,
   cachePort: process.env.CACHE_PORT || dev.cachePort,
   jwtSecret: process.env.JWT_SECRET || dev.jwtSecret,
   apiEndpoint: process.env.API_ENDPOINT || dev.apiEndpoint,
   aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || dev.aws.accessKeyId,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || dev.aws.secretAccessKey,
      awsRegion: process.env.AWS_REGION || dev.aws.awsRegion
   },
   dynamoDbEndpoint: process.env.DYNAMODB_ENDPOINT || dev.dynamoDbEndpoint,

   webappBaseUri: process.env.WEBAPP_BASE_URI || dev.webappBaseUri
};
export default config;

