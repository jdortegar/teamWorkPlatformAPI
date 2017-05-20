import AWS from 'aws-sdk';
import bluebird from 'bluebird';
import redis from 'redis';
import config from './config/env';
import app from './config/express';
import logger from './logger';
import messagingSvc from './services/messaging/messagingService';

let redisClient;
let server;

function startupInfo() {
   logger.info('Habla API Startup');
   logger.info('---------------------------------------------------------');
   logger.info(`AWS Region       : ${config.aws.awsRegion}`);
   logger.info(`DynamoDB Endpoint: ${config.dynamoDbEndpoint}`);
   logger.info(`Table Prefix     : ${config.tablePrefix}`);
   logger.info(`Redis Server     : ${config.cacheServer}`);
   logger.info(`Redis Port       : ${config.cachePort}`);
   logger.info(`NodeJS Port      : ${config.nodePort}`);
   logger.info();
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

      logger.info('Connected to DynamoDB.');
      resolve(dynamodb);
   });
}


export function connectRedis() {
   bluebird.promisifyAll(redis.RedisClient.prototype);
   bluebird.promisifyAll(redis.Multi.prototype);

   const redisConfig = {
      host: config.cacheServer,
      port: config.cachePort
   };
   const client = redis.createClient(redisConfig);
   app.locals.redis = client;

   client.on('error', (err) => {
      logger.error(`Redis Client Error ${err}`);
   });

   logger.info('Connected to Redis.');
   return Promise.resolve(client);
}

export function disconnectRedis(client) {
   client.quit();
   logger.info('Disconnected from Redis.');
   return Promise.resolve();
}


export function startServer() {
   return new Promise((resolve, reject) => {
      const httpServer = app.listen(config.nodePort, (err) => {
         if (err) {
            logger.error(`Error starting server on port ${config.nodePort}.`, err);
            reject(err);
         } else {
            messagingSvc.init(httpServer);
            logger.info(`Server started on port ${config.nodePort}`);
            logger.info('---------------------------------------------------------');
            resolve(httpServer);
         }
      });
   });
}

export function stopServer(httpServer) {
   return new Promise((resolve, reject) => {
      messagingSvc.close()
         .then(() => {
            return new Promise((resolveHttpServer) => {
               httpServer.close(() => {
                  logger.info('Stopped server.');
                  resolveHttpServer();
               });
            });
         })
         .catch(() => {
            return new Promise((resolveHttpServer) => {
               httpServer.close(() => {
                  logger.info('Stopped server.');
                  resolveHttpServer();
               });
            });
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
}

// this function is called when you want the server to die gracefully
// i.e. wait for existing connections
function gracefulShutdown() {
   logger.info('Received kill signal, shutting down gracefully.');
   stopServer(server)
      .then(() => disconnectRedis(redisClient))
      .catch(err => logger.error(err));
   // server.close(() => {
   //    console.log('Closed out remaining connections.');
   //    redisclient.quit();
   //    process.exit();
   // });

   // if after
   setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      redisClient.end(true);
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
      .then((dbAndRedisStatuses) => {
         redisClient = dbAndRedisStatuses[1];
         return startServer();
      })
      .then((httpServer) => {
         server = httpServer;
         return registerGracefulShutdown();
      })
      .catch(err => logger.error(err));
}
