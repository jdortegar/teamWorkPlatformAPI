import { setupDynamoDb, connectRedis, disconnectRedis } from '../bootstrap';

export default class BaseFixture {
   static TestTypes = Object.freeze({
      unit: 'unit',
      db: 'db',
      server: 'server',
      ui: 'ui',
      from(value) { return (this[value]); }
   });

   testType;
   redisClient;


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
                     this.redisCLient = dbRedisStatuses[1];
                     resolve();
                  })
                  .catch(err => reject(err));
            });
         case BaseFixture.TestTypes.server:
            return Promise.reject('TODO: test type server.');
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
            disconnectRedis(this.redisClient);
            return Promise.resolve();
         case BaseFixture.TestTypes.server:
            return Promise.reject('TODO: test type server.');
         case BaseFixture.TestTypes.ui:
            return Promise.reject('TODO: tet type ui');
         default:
            throw new Error(`Unhandled test type: ${this.testType}`);
      }
   }
}
