import AWS from 'aws-sdk';
import neo4j from 'neo4j-driver';
import config, { applyPropertiesFromDbToConfig, applyEnvironmentToConfig } from './config/env';
import app from './config/express';
import logger, { createPseudoRequest } from './logger';
import { getAllSystemProperties } from './repositories/db/systemPropertiesTable';
import messagingSvc from './services/messaging/messagingService';
import { listenForInternalEvents, stopListeningForInternalEvents } from './services/messaging/internalQueue';
import { connectToRedis, disconnectFromRedis } from './redis-connection';
import { ensureCachedByteCountExists, startCronUpdateCustomerEntitlements } from './services/awsMarketplaceService';

let redisClient;
let server;

AWS.config.update({
   accessKeyId: config.aws.accessKeyId,
   secretAccessKey: config.aws.secretAccessKey,
   region: config.aws.awsRegion
});

const startupInfo = () => {
   logger.info('Habla API Startup');
   logger.info('---------------------------------------------------------');
   logger.info(`AWS Region       : ${config.aws.awsRegion}`);
   logger.info(`DynamoDB Endpoint: ${config.dynamoDbEndpoint}`);
   logger.info(`Table Prefix     : ${config.tablePrefix}`);
   logger.info(`Redis Server     : ${config.cacheServer}`);
   logger.info(`Redis Port       : ${config.cachePort}`);
   logger.info(`NodeJS Port      : ${config.nodePort}`);
   logger.info();
};


export const setupDynamoDb = () => {
   return new Promise((resolve) => {
      AWS.config.dynamodb = { endpoint: config.dynamoDbEndpoint };
      const dynamodb = new AWS.DynamoDB();
      app.locals.AWS = AWS;
      app.locals.db = dynamodb;
      app.locals.docClient = new AWS.DynamoDB.DocumentClient();

      logger.info('Connected to DynamoDB.');
      resolve(dynamodb);
   });
};

export const setupNeo4j = () => {
   const { host, port, user, password } = config.neo4j;
   const driver = neo4j.driver(`bolt://${host}:${port}`, neo4j.auth.basic(user, password));

   app.locals.neo4jDriver = driver;
   app.locals.neo4jSession = driver.session();
};

export const connectRedis = () => {
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
};

export const disconnectRedis = (client) => {
   return new Promise((resolve, reject) => {
      disconnectFromRedis(client)
         .then(() => {
            logger.info('Disconnected from Redis.');
            resolve();
         })
         .catch(err => reject(err));
   });
};


export const startServer = (redisclient, handleInternalEvents = true) => {
   return new Promise((resolve, reject) => {
      const httpServer = app.listen(config.nodePort, (err) => {
         if (err) {
            logger.error(`Error starting server on port ${config.nodePort}.`, err);
            reject(err);
         } else {
            messagingSvc.init(httpServer, redisclient);
            if (handleInternalEvents) {
               listenForInternalEvents();
            }
            logger.info(`Server started on port ${config.nodePort}`);
            logger.info('---------------------------------------------------------');
            resolve(httpServer);
         }
      });
   });
};

const stopServer = (httpServer) => {
   return new Promise((resolve, reject) => {
      stopListeningForInternalEvents()
         .then(() => messagingSvc.close())
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
};

// This function is called when you want the server to die gracefully.
// i.e. wait for existing connections.
const gracefulShutdown = () => {
   logger.info('Received kill signal, shutting down gracefully...');

   const kill = setTimeout(() => {
      logger.error('Could not shutdown in time, forcefully shutting down.');
      process.exit();
   }, 10 * 1000); // Force shutdown in 10 seconds.

   stopServer(server)
      .then(() => disconnectRedis(redisClient))
      .then(() => clearTimeout(kill))
      .catch(err => logger.error(err));
};

const registerGracefulShutdown = () => {
   return new Promise((resolve) => {
      // Listen for TERM signal .e.g. kill.
      process.on('SIGTERM', gracefulShutdown);

      // Listen for INT signal e.g. Ctrl-C.
      process.on('SIGINT', gracefulShutdown);

      resolve();
   });
};


const start = () => {
   const bootup = applyEnvironmentToConfig() // AWS and DB connection properties used.
      .then(() => setupDynamoDb())
      .then(() => setupNeo4j())
      .then(() => getAllSystemProperties(createPseudoRequest()))
      .then(propertiesFromDb => applyPropertiesFromDbToConfig(propertiesFromDb))
      .then(() => applyEnvironmentToConfig()) // Reapply, since environment takes precedence.
      .then(() => startupInfo())
      .then(() => connectRedis())
      .then((dbAndRedisStatuses) => {
         redisClient = dbAndRedisStatuses;
         return startServer(redisClient, false);
      })
      .then((httpServer) => {
         server = httpServer;
         return registerGracefulShutdown();
      })
      .then(() => ensureCachedByteCountExists(createPseudoRequest()))
      .catch(err => logger.error(err));

   // Only update entitlements if in prod for AWS Marketplace.
   if (config.tablePrefix === 'PROD_') {
      bootup.then(() => startCronUpdateCustomerEntitlements());
   }
};
export default start;

