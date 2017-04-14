import BaseFixture from '../../src/__tests__/BaseFixture';

let baseFixture;

beforeEach(async () => {
   baseFixture = new BaseFixture(BaseFixture.TestTypes.db);
   return baseFixture.setup();
});

afterEach(async () => {
   baseFixture.teardown();
});


test('Add user.', async () => {
});
