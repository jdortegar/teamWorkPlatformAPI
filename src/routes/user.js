import express from 'express';
import validate from 'express-validation';
import paramValidation from '../config/param-validation';
import * as users from '../controllers/users';
import { containsRole,roles } from '../policies';

const router = express.Router();

router.route('/registerUser')
   .post(validate(paramValidation.registerUser), users.createReservation);

router.route('/validateEmail/:rid')
   .get(users.validateEmail);

router.route('/createUser')
  .post(validate(paramValidation.createUser), users.createUser)
  .delete(users.del);

router.route('/updateUser')
   .patch(validate(paramValidation.updateUser), users.updateUser);

router.route('/updatePublicPreferences/:userId')
   .patch(validate(paramValidation.updateUserPublicPreferences), users.updatePublicPreferences);

router.route('/:userId')
  .put(users.update);


router.route('/passwordreset')
  .post(users.resetPassword);

router.route('/passwordupdate')
  .post(users.updatePassword);

export default router;

