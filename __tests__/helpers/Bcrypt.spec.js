import BaseFixture from '../../src/__tests__/BaseFixture';
import Bcrypt from '../../src/helpers/Bcrypt';

let baseFixture;

beforeEach(async () => {
   baseFixture = new BaseFixture(BaseFixture.TestTypes.unit);
   await baseFixture.setup();
});

afterEach(async () => {
   await baseFixture.teardown();
});

test('Hash using strength=11.', async () => {
   const bcrypt = new Bcrypt(11);

   const original = 'Hello, World!';
   const hash = bcrypt.hash(original);

   expect(Bcrypt.compare(original, hash)).toBeTruthy();
   expect(Bcrypt.compare(original, original)).toBeFalsy();
   expect(Bcrypt.compare(hash, hash)).toBeFalsy();
});
