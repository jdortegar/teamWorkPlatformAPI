import AWS from 'aws-sdk';
import config from './config/env';
import app from './config/express';
import logger from './logger';
import messagingSvc from './services/messaging/messagingService';
import { connectToRedis, disconnectFromRedis } from './redis-connection';

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
   const redisConfig = {
      host: config.cacheServer,
      port: config.cachePort
   };

   return new Promise((resolve, reject) => {
      connectToRedis(redisConfig)
         .then((client) => {
            app.locals.redis = client;
            logger.info('Connected to Redis.');
            resolve(client);
         })
         .catch(err => reject(err));
   });
}

export function disconnectRedis(client) {
   return new Promise((resolve, reject) => {
      disconnectFromRedis(client)
         .then(() => {
            logger.info('Disconnected from Redis.');
            resolve();
         })
         .catch(err => reject(err));
   });
}


export function startServer(redisclient) {
   return new Promise((resolve, reject) => {
      const httpServer = app.listen(config.nodePort, (err) => {
         if (err) {
            logger.error(`Error starting server on port ${config.nodePort}.`, err);
            reject(err);
         } else {
            messagingSvc.init(httpServer, redisclient);
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

// This function is called when you want the server to die gracefully.
// i.e. wait for existing connections.
function gracefulShutdown() {
   logger.info('Received kill signal, shutting down gracefully...');

   const kill = setTimeout(() => {
      logger.error('Could not shutdown in time, forcefully shutting down.');
      process.exit();
   }, 10 * 1000);

   stopServer(server)
      .then(() => disconnectRedis(redisClient))
      .then(() => clearTimeout(kill))
      .catch(err => logger.error(err));
}

function registerGracefulShutdown() {
   return new Promise((resolve) => {
      // Listen for TERM signal .e.g. kill.
      process.on('SIGTERM', gracefulShutdown);

      // Listen for INT signal e.g. Ctrl-C.
      process.on('SIGINT', gracefulShutdown);

      resolve();
   });
}


export default function start() {
   startupInfo();
   Promise.all([setupDynamoDb(), connectRedis()])
      .then((dbAndRedisStatuses) => {
         redisClient = dbAndRedisStatuses[1];
         return startServer(redisClient);
      })
      .then((httpServer) => {
         server = httpServer;
         return registerGracefulShutdown();
      })
      .catch(err => logger.error(err));
}
