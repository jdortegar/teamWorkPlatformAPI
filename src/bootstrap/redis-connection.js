import bluebird from 'bluebird';
import redis from 'redis';
import logger from './logger';

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

export const connectToRedis = (redisUrl) => {
    return new Promise((resolve, reject) => {
        const client = redis.createClient(redisUrl);
  
        client.on('ready', () => {
            resolve(client);
        });
  
        client.on('error', (err) => {
            reject(err);
        });
    });
};

export const disconnectFromRedis = (client) => {
    return new Promise((resolve) => {
        const killRedisConnection = setTimeout(() => {
            logger.error('Could not close redis connections in time, forcefully closing redis connections.');
            client.end(true);
            resolve();
        }, 8 * 1000);
 
        client.quit();
        client.on('end', () => {
            clearTimeout(killRedisConnection);
            return resolve();
        });
    });
};
 