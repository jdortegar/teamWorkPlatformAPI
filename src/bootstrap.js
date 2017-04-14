import AWS from 'aws-sdk';
import bluebird from 'bluebird';
import redis from 'redis';
import config from './config/env';
import app from './config/express';

let redisclient;

function startupInfo() {
   console.log('Habla API Startup');
   console.log('---------------------------------------------------------');
   console.log(`AWS Region       : ${config.aws.awsRegion}`);
   console.log(`DynamoDB Endpoint: ${config.dynamoDbEndpoint}`);
   console.log(`Table Prefix     : ${config.tablePrefix}`);
   console.log(`Redis Server     : ${config.cacheServer}`);
   console.log(`Redis Port       : ${config.cachePort}`);
   console.log(`NodeJS Port      : ${config.nodePort}`);
   console.log();
}

export function setupDynamoDb() {
   return new Promise((resolve) => {
      AWS.config.update({
         region: config.aws.awsRegion,
         endpoint: config.dynamoDbEndpoint
      });
      const dynamodb = new AWS.DynamoDB();
      app.locals.AWS = AWS;
      app.locals.db = dynamodb;

      console.log('Connected to DynamoDB.');
      resolve();
   });
}

export function connectRedis() {
   bluebird.promisifyAll(redis.RedisClient.prototype);
   bluebird.promisifyAll(redis.Multi.prototype);

   const redisConfig = {
      host: config.cacheServer,
      port: config.cachePort
   };
   redisclient = redis.createClient(redisConfig);
   app.locals.redis = redisclient;

   redisclient.on('error', (err) => {
      console.log(`Redis Client Error ${err}`);
   });

   console.log('Connected to Redis.');
   return Promise.resolve(redisclient);
}

export function disconnectRedis() {
   redisclient.quit();
   console.log('Disonnected from Redis.');
   return Promise.resolve();
}

let server;

function startServer() {
   return new Promise((resolve, reject) => {
      server = app.listen(config.nodePort, (err) => {
         if (err) {
            console.err(`Error starting server on port ${config.nodePort}.  ${err}`);
            reject(err);
         } else {
            console.log(`Server started on port ${config.nodePort}`);
            console.log('---------------------------------------------------------');
            resolve();
         }
      });
   });
}

// this function is called when you want the server to die gracefully
// i.e. wait for existing connections
function gracefulShutdown() {
   console.log('Received kill signal, shutting down gracefully.');
   server.close(() => {
      console.log('Closed out remaining connections.');
      redisclient.quit();
      process.exit();
   });

   // if after
   setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      redisclient.end(true);
      process.exit();
   }, 10 * 1000);
}

function registerGracefulShutdown() {
   return new Promise((resolve) => {
      // listen for TERM signal .e.g. kill
      process.on('SIGTERM', gracefulShutdown);

      // listen for INT signal e.g. Ctrl-C
      process.on('SIGINT', gracefulShutdown);

      // console.log('                             registered graceful shutdown ');
      resolve();
   });
}


export default function start() {
   startupInfo();
   Promise.all([setupDynamoDb(), connectRedis()])
      .then(() => startServer())
      .then(() => registerGracefulShutdown())
      .catch(err => console.error(err));
}
