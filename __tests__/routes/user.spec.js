import moment from 'moment';
import request from 'supertest';
import BaseFixture from '../../src/__tests__/BaseFixture';
import app from '../../src/config/express';
import { deleteReservation } from '../../src/controllers/users';

let baseFixture;
let rid;
let cachedUserEmail;

beforeAll(async () => {
   baseFixture = new BaseFixture(BaseFixture.TestTypes.server);
   await baseFixture.setup();
});

afterEach(async () => {
   if (rid) {
      const req = { app, now: moment.utc() };
      await deleteReservation(req, rid);
   }
   if (cachedUserEmail) {
      const req = { app, now: moment.utc() };
      await deleteReservation(cachedUserEmail, rid);
   }
   rid = undefined;
});

afterAll(async () => {
   await baseFixture.teardown();
});


test('Register and validate reservation.', async () => {
   let req = await request(app).post('/users/registerUser')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`email=${encodeURIComponent('test@habla.ai')}`);

   expect(req.status).toBe(201);

   rid = req.body.uuid;

   req = await request(app).get(`/users/validateEmail/${rid}`);

   expect(req.status).toBe(200);
});

test('Register with an invalid email.', async () => {
   const req = await request(app).post('/users/registerUser')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`email=${encodeURIComponent('notAnEmail')}`);

   expect(req.status).toBe(400);
});

test('Validate non-existing reservation.', async () => {
   const rid = 'abc';
   const req = await request(app).get(`/users/validateEmail/${rid}`);

   expect(req.status).toBe(404);
});

test.only('Register and create user.', async () => {
   let req = await request(app).post('/users/registerUser')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`email=${encodeURIComponent('test@habla.ai')}`);

   expect(req.status).toBe(201);

   rid = req.body.uuid;

   const createUserBody = {
      firstName: 'Anthony',
      lastName: 'Daga',
      displayName: 'Dude',
      email: 'anthony.daga@habla.ai',
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
   cachedUserEmail = createUserBody.email;

   req = await request(app).post('/users/createUser')
      .set('Content-Type', 'application/json')
      .send(createUserBody);

   expect(req.status).toBe(201);
});
