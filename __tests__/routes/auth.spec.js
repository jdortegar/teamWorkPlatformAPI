import BaseFixture from '../../src/__tests__/BaseFixture';

let baseFixture;

beforeEach(async () => {
   baseFixture = new BaseFixture(BaseFixture.TestTypes.server);
   console.log('AD: 1');
   await baseFixture.setup();
   console.log('AD: 2');
});

afterEach(async () => {
   console.log('AD: 3');
   await baseFixture.teardown();
   console.log('AD: 4');
});


test('Register user.', async () => {
   console.log('AD: 5');
});

