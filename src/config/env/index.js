import * as dev from './development';
import * as test from './test';

let defaultConfig = dev;
if (process.env.NODE_ENV === 'test') {
   defaultConfig = test;
}

const config = {
   nodePort: process.env.NODE_PORT || defaultConfig.nodePort,
   tablePrefix: process.env.TBL_PREFIX || defaultConfig.tablePrefix,
   cacheServer: process.env.CACHE_SERVER || defaultConfig.cacheServer,
   cachePort: process.env.CACHE_PORT || defaultConfig.cachePort,
   jwtSecret: process.env.JWT_SECRET || defaultConfig.jwtSecret,
   apiEndpoint: process.env.API_ENDPOINT || defaultConfig.apiEndpoint,
   aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || defaultConfig.aws.accessKeyId,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || defaultConfig.aws.secretAccessKey,
      awsRegion: process.env.AWS_REGION || defaultConfig.aws.awsRegion
   },
   dynamoDbEndpoint: process.env.DYNAMODB_ENDPOINT || defaultConfig.dynamoDbEndpoint,

   webappBaseUri: process.env.WEBAPP_BASE_URI || defaultConfig.webappBaseUri
};
export default config;
