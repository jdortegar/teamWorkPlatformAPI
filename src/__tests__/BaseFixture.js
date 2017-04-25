import { setupDynamoDb, connectRedis, disconnectRedis, startServer, stopServer } from '../bootstrap';

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
                  setupDynamoDb(),
                  connectRedis()
               ])
                  .then((dbRedisStatuses) => {
                     this.dynamoDb = dbRedisStatuses[0];
                     this.redisClient = dbRedisStatuses[1];
                     resolve();
                  })
                  .catch(err => reject(err));
            });
         case BaseFixture.TestTypes.server:
            return new Promise((resolve, reject) => {
               Promise.all([
                  setupDynamoDb(),
                  connectRedis()
               ])
                  .then((dbRedisStatuses) => {
                     this.dynamoDb = dbRedisStatuses[0];
                     this.redisClient = dbRedisStatuses[1];
                     return startServer();
                  })
                  .then((httpServer) => {
                     this.httpServer = httpServer;
                     resolve();
                  })
                  .catch(err => reject(err));
            });
         case BaseFixture.TestTypes.ui:
            return Promise.reject('TODO: tet type ui');
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
            return disconnectRedis(this.redisClient);
         case BaseFixture.TestTypes.server:
            return new Promise((resolve, reject) => {
               disconnectRedis(this.redisClient)
                  .then(() => stopServer(this.httpServer))
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
