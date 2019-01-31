export const nodePort = 3000;
export const tablePrefix = 'DEV1_';
export const cacheServer = 'localhost';
export const cachePort = 6379;
export const redisPrefix = '';
export const aesKey = 'AI-Infused Knowledge Management for Enterprise Teams';
export const jwtSecret = '69157cde-e3a7-4079-b79a-95a35d58c6d3';
export const apiEndpoint = 'http://localhost:3000';
// export const apiEndpoint = 'https://hablaapi.ngrok.io';
export const aws = {
   accessKeyId: 'AKIAJUWK5MDFUPOKWM4A',
   secretAccessKey: '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',
   awsRegion: 'us-west-2'
};

export const neo4j = {
   /*
      host: 'localhost',
      port: '7687',
      user: 'neo4j',
      password: '123456'
      */
   // DEV

   // host: '34.214.167.0',
   host: '34.214.167.0',
   port: '7687',
   user: 'neo4j',
   password: 'habla12345'
};
// export const dynamoDbEndpoint = 'http://localhost:8000';
// export const dynamoDbEndpoint = 'https://dynamodb.us-west-2.amazonaws.com';
export const dynamoDbEndpoint = process.env.DYNAMODB_ENDPOINT || 'https://dynamodb.us-west-2.amazonaws.com';
export const webappBaseUri = 'http://localhost:9090';
// export const webappBaseUri = 'https://hablawebapp.ngrok.io';

export const resourcesBaseUrl = 'https://uw33cc3bz4.execute-api.us-west-2.amazonaws.com/dev';
// export const resourcesBaseUrl = 'https://hablaresources.ngrok.io';

export const signedCookieSecret = '4fIv(E2@';

export const loggerLevel = 'debug';
export const loggerJson = false;

export const boxClientId = 'vxgmdcz8mdmi6c34r16ds7luymbsesz9';
export const boxClientSecret = 'apOslMTxN3qidF3PTSkVuwLY4kdHPWPn';
// export const boxClientId = 'a666hm00w8qtw6cuxutbb9et7bxvso7j'; // ngrok
// export const boxClientSecret = 'KdRfL9bePDT4BnhYGTWQX7Uukfn7ygRU'; // ngrok
export const boxWebhooksPrimaryKey = 'fWo4rJNBbVeSpQ0llAdiM5GnDer1CPLE';
export const boxWebhooksSecondaryKey = 'Q5Ht4J6nucMSxTnXKRKk1w9LwJaBefLY';

export const googleClientId = '801943186202-5cp3slnr8mi8vmtdruiessk3i5ugneg0.apps.googleusercontent.com';
export const googleClientSecret = 'VPDsaJ5aAKs9gNt4y1CQBl1Z';

export const sharepointClientId = '371c2267-55a2-4189-9af8-53c18bbdb605';
export const sharepointClientSecret = 'p1CbLjcM0/Vqr1TP4s6yzR6CPPfyRpQ+mlBqtrvarAw=';
// export const sharepointClientId = 'd0032bb6-4898-4da3-8a0f-d16f185dfe44'; // ngrok
// export const sharepointClientSecret = 'sKtwfhTxjtBriCzu249/8BpHlptChV07zEJkG37G6WU='; // ngrok

export const onedriveClientId = '2057588a-6553-45cd-ba97-eed9c941a51c';
export const onedriveClientSecret = 'bxzwNVL89)!gssEEKD812^=';
// export const onedriveClientId = 'd2061ee6-7c0d-415f-942f-8318952579c8';
// export const onedriveClientSecret = 'kbWGVYM93_)koyjbQK557!)';

// export const salesforceClientId = '3MVG9zlTNB8o8BA3yxc0Y3VFQq5pZNVvejwizNZqqwXxlyUCCnf_4aHlR4QK5sP41BspCZ2Hjf56LoJfCJs08';
// export const salesforceClientSecret = '1586929814816678095';
export const salesforceClientId =
   '3MVG9oNqAtcJCF.Ea6OlRa89hxdSbH_QlHqGyqB099ZQ9N1vzqLHC9fMdElFKXDDsh7AUHI2QKhpgb4oowUqa';
export const salesforceClientSecret = '3843359686979533442';
// export const salesforceClientId = '3MVG9oNqAtcJCF.Hipaqdn8RbUN9YmDIby5aSVbkdExNKPvizD_nfOhxPVcYoqMLWfkmkwuWPXg==';
// export const salesforceClientSecret = '6768971095996066050';

export const dropboxClientId = '4ml1epnmlwvwzyv';
export const dropboxClientSecret = 'tyw311ric33ypcn';

export const awsProductCode = '8loyvo6g5k96nfobn626rwjbj';
export const redshift = {
   user: 'root',
   database: 'habladb',
   password: 'MAnchi89',
   host: 'habla-ai.csvoexx0fghm.us-west-2.redshift.amazonaws.com',
   port: 5439,
   tablePrefix: 'dev'
};
export const surveyTable = 'dev_usage_survey';

// Stripe Config

export const stripeConfig = {
   // Default country for the checkout form.
   country: 'US',
   currency: 'usd',

   // Configuration for Stripe.
   stripe: {
      country: 'US',
      apiVersion: '2018-10-31',
      publishableKey: 'pk_test_Ps3YX1kKZUOPHfZu9DjtAJRr',
      secretKey: 'sk_test_rEf899cFVromgNDVHewmYhzj'
   }
};

export const paypalConfig = {
   mode: 'sandbox', //sandbox or live
   clientId: 'AczTEVuMJOAV_15gnNTJB7-qRmpbiUsEdc9EYxAYjD6GRUZvnVdkRsbAyvzx_6b2iuc1P47VT8tY-M_F',
   clientSecret: 'EEdcloOEfcC68aFTAUMbz5MbvjUtprwlTOKSQHMntgFSbei4Yv-nDEoJjvHB3YAfcduCjSkeKSgk6Ogp'
}

export const knowledgeApiEndpoint = 'https://habla-be-api-dev.habla.ai';

// PayPal Live
// mode: 'live'
// ClientId: 'AauNES2FY9H6-1HOQxWm_d4IjuJ1Ramc6db2MttjJAq72eVMRyIcywGLLHn8S1pFWpyxCHTCYHZVu6Vj'
// SecretId: 'EIXJrSshA3lZsRncfSvFvIxOULjmWrzUYlvanlV-iqQYhDKBEwVD8hupAvN7ZTzmoBs16FmUYvtwIjTF'

// publishableKey: 'pk_test_LvwApQvFOvPMs0bUSNUnplbb',
// secretKey: 'sk_test_kDDtLeXmTDqyHxkLiwbrBTQR'
// publishableKey: 'pk_live_EYULQ2u9a4EBUMKjoEwFX8W3',
// secretKey: 'sk_live_1zwgvM8siP8VRhR4dqCg2mIV'

// Test Account
// publishableKey: 'pk_test_Ps3YX1kKZUOPHfZu9DjtAJRr',
// secretKey: 'sk_test_rEf899cFVromgNDVHewmYhzj'

export const notificationEmail = 'thomas@habla.ai, kelly@habla.ai';
