import request from 'supertest';
import BaseFixture from '../../src/__tests__/BaseFixture';
import app from '../../src/config/express';
import { deleteRedisKey } from '../../src/controllers/users';

let baseFixture;
let rid;
let cachedUserEmail;

const createUserBody = {
   firstName: 'Marisa',
   lastName: 'Miller',
   displayName: 'Dude',
   email: 'marisa.miller@habla.ai',
   password: 'HelloWorld#123',
   country: 'US',
   timeZone: 'America/Los_Angeles',
   icon: null,
   preferences: {
      iconColor: 'red',
      private: {
         lastWindowLocation: '110, 64'
      }
   }
};

beforeAll(async () => {
   baseFixture = new BaseFixture(BaseFixture.TestTypes.db);
   await baseFixture.setup();

   let req = await request(app).post('/users/registerUser')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`email=${encodeURIComponent('marisa.miller@habla.ai')}`);

   rid = req.body.uuid;

   cachedUserEmail = createUserBody.email;

   await request(app).post('/users/createUser')
      .set('Content-Type', 'application/json')
      .send(createUserBody);
});

afterAll(async () => {
   if (rid) {
      await deleteRedisKey(rid);
   }
   if (cachedUserEmail) {
      await deleteRedisKey(cachedUserEmail);
   }
   rid = undefined;

   await baseFixture.teardown();
});


test('Login.', async () => {
   let req = await request(app).post('/auth/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`username=${encodeURIComponent('marisa.miller@habla.ai')}&password=${encodeURIComponent('HelloWorld#123')}`);

   expect(req.status).toBe(200);

   const body = req.body;
   expect(body.status).toBe('SUCCESS');
   expect(body.token).toBeDefined();
   expect(body.websocketUrl).toMatch(/http:\/\/*/);

   const user = body.user;
   expect(user).toBeDefined();
   expect(user.firstName).toBe(createUserBody.firstName);
   expect(user.lastName).toBe(createUserBody.lastName);
   expect(user.displayName).toBe(createUserBody.displayName);
   expect(user.email).toBe(createUserBody.email);
   expect(user.password).toBeUndefined();
   expect(user.country).toBe(createUserBody.country);
   expect(user.timeZone).toBe(createUserBody.timeZone);
   expect(user.icon).toBeNull();

   const preferences = user.preferences;
   expect(preferences).toBeDefined();
   expect(preferences.iconColor).toBe(createUserBody.preferences.iconColor);
   expect(preferences.private).toBeDefined();
   expect(preferences.private.lastWindowLocation).toBe(preferences.private.lastWindowLocation);
});

test('Login with bad password.', async () => {
   let req = await request(app).post('/auth/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`username=${encodeURIComponent('marisa.miller@habla.ai')}&password=${encodeURIComponent('WrongPW')}`);

   expect(req.status).toBe(401);
});

test('Login with unknown user.', async () => {
   let req = await request(app).post('/auth/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`username=${encodeURIComponent('lily.aldridge@habla.ai')}&password=${encodeURIComponent('HelloWorld#123')}`);

   expect(req.status).toBe(401);
});
