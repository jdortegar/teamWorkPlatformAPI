import BaseFixture from '../../src/__tests__/BaseFixture';
import Messaging from '../../src/__tests__/Messaging';
import config from '../../src/config/env';

let baseFixture;

beforeEach(async () => {
   baseFixture = new BaseFixture(BaseFixture.TestTypes.server);
   return baseFixture.setup();
});

afterEach(async () => {
   baseFixture.teardown();
});


test('Send simple event.', async () => {
   //const messaging = new Messaging(config.apiEndpoint);
   const messaging = new Messaging('http://localhost:3000');
   messaging.send('Hello from client');
   //messaging.close();
});

