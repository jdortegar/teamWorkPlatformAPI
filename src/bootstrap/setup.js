import AWS from 'aws-sdk';
import neo4j from 'neo4j-driver';
import app from './app.js';
import config from '../config';
import logger, { createPseudoRequest } from './logger'; // eslint-disable-line
import { connectToRedis, disconnectFromRedis } from './redis-connection';


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
    AWS.config.dynamodb = { endpoint: config.dynamoDbEndpoint };
    const dynamodb = new AWS.DynamoDB();
    app.locals.AWS = AWS;
    app.locals.db = dynamodb;
    app.locals.docClient = new AWS.DynamoDB.DocumentClient();

    logger.info('Connected to DynamoDB.');
    return dynamodb;
};

export const setupNeo4j = () => {
    const { host, port, user, password } = config.neo4j;
    const driver = neo4j.driver(`bolt://${host}:${port}`, neo4j.auth.basic(user, password));
 
    app.locals.neo4jDriver = driver;
    app.locals.neo4jSession = driver.session();
};

export const connectRedis = async () => {
    const redisUrl = `redis://${config.cacheServer}:${config.cachePort}`;
    const client = await connectToRedis(redisUrl);
    app.locals.redis = client;
    logger.info('Connected to Redis');
    return client;

};

export const disconnectRedis = async (client) => {
    await disconnectFromRedis(client);
    logger.info('Disconnected from Redis. ');
};

export const startServer = (redisclient, handleInternalEvents = true) => { // eslint-disable-line
    return new Promise((resolve, reject) => {
        const httpServer = app.listen(config.nodePort, (err) => {
            if (err) {
                logger.error(`Error starting server on port ${config.nodePort}.`, err);
                reject(err);
            } else {
                // TODO: enable messaging Service src/bootsrap.js line 84
                // messagingSvc.init(httpServer, redisclient);
                // if (handleInternalEvents) {
                //     listenForInternalEvents();
                // }
                logger.info(`Server started on port ${config.nodePort}`);
                logger.info('---------------------------------------------------------');
                resolve(httpServer);
            }
        });
    });
};

export const stopServer = (httpServer) => {
    // TODO: stop listennig for events before close server src/bootstrap.js line 103
    return new Promise((resolve) => {
        httpServer.close(() => {
            logger.info('Stoped Server.');
            resolve();
        });
    });
};

const gracefulShutdown = async () => {
    logger.info('Received kill signal, shutting down gracefully...');
 
    const kill = setTimeout(() => {
        logger.error('Could not shutdown in time, forcefully shutting down.');
        process.exit();
    }, 10 * 1000); // Force shutdown in 10 seconds.
    
    try {
        await stopServer(server);
        await disconnectFromRedis(redisClient);
        clearTimeout(kill);
    } catch (err) {
        logger.error(err);
    }
};

const registerGracefulShutdown = () => {
    return new Promise((resolve) => {
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
        resolve();
    });
};

const start = async () => {
    try {
        await setupDynamoDb();
        await setupNeo4j();
        // TODO: Get all System Properties src/bootstrap.js line 161 - 162
        startupInfo();
        redisClient = await connectRedis();
        server = startServer(redisClient, false);
        await registerGracefulShutdown();
        // TODO: migrate ensureCachedByteCountExist src/bootsrap.js line 174
        // TODO: migrate startCronUpdateCustomerEntitlements src/bootstrap.js lime 178 - 180
    } catch (err) {
        logger.error(err);
    }
};

export default start;
