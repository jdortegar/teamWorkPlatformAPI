import { setupDynamoDb, connectRedis, disconnectRedis, startServer, stopServer } from '../bootstrap';
import { createAllTables, deleteAllTables } from './schema';
import app from '../config/express';

export default class BaseFixture {
   static TestTypes = Object.freeze({
      unit: 'unit',
      db: 'db',
      server: 'server',
      ui: 'ui',
      from(value) { return (this[value]); }
   });

   testType;
   dynamoDb;
   redisClient;
   httpServer;


   constructor(testType) {
      if (BaseFixture.TestTypes[testType] === undefined) {
         throw new Error(`Unknown test type: "${testType}".  Valid values are ${BaseFixture.TestTypes}`);
      }
      this.testType = testType;
   }

   setup() {
      switch (this.testType) {
         case BaseFixture.TestTypes.unit:
            // Nothing to setup.
            return Promise.resolve();
         case BaseFixture.TestTypes.db:
            return new Promise((resolve, reject) => {
               Promise.all([
                  createAllTables(),
                  setupDynamoDb(),
                  connectRedis()
               ])
                  .then((dbRedisStatuses) => {
                     this.dynamoDb = dbRedisStatuses[1];
                     this.redisClient = dbRedisStatuses[2];
                     app.locals.db = this.dynamodb;
                     app.locals.redis = this.redisClient;
                     resolve();
                  })
                  .catch(err => reject(err));
            });
         case BaseFixture.TestTypes.server:
            return new Promise((resolve, reject) => {
               Promise.all([
                  createAllTables(),
                  setupDynamoDb(),
                  connectRedis()
               ])
                  .then((dbRedisStatuses) => {
                     this.dynamoDb = dbRedisStatuses[1];
                     this.redisClient = dbRedisStatuses[2];
                     app.locals.db = this.dynamodb;
                     app.locals.redis = this.redisClient;
                     return startServer(this.redisClient);
                  })
                  .then((httpServer) => {
                     this.httpServer = httpServer;
                     resolve();
                  })
                  .catch(err => reject(err));
            });
         case BaseFixture.TestTypes.ui:
            return Promise.reject('TODO: test type ui');
         default:
            throw new Error(`Unhandled test type: ${this.testType}`);
      }
   }

   teardown() {
      switch (this.testType) {
         case BaseFixture.TestTypes.unit:
            // Nothing to setup.
            return Promise.resolve();
         case BaseFixture.TestTypes.db:
            return Promise.all([
               disconnectRedis(this.redisClient),
               deleteAllTables()
            ]);
         case BaseFixture.TestTypes.server:
            return new Promise((resolve, reject) => {
               stopServer(this.httpServer)
                  .then(() => disconnectRedis(this.redisClient))
                  .then(() => deleteAllTables())
                  .then(() => resolve())
                  .catch(err => reject(err));
            });
         case BaseFixture.TestTypes.ui:
            return Promise.reject('TODO: tet type ui');
         default:
            throw new Error(`Unhandled test type: ${this.testType}`);
      }
   }
}
