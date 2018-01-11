import express from 'express';
import { apiVersionedValidators, validateByApiVersion } from '../config/param-validation';
import * as users from '../controllers/users';
// import { containsRole,roles } from '../policies';

const router = express.Router();

router.route('/registerUser')
   .post(validateByApiVersion(apiVersionedValidators.registerUser), users.createReservation);

router.route('/validateEmail/:rid')
   .get(users.validateEmail);

router.route('/createUser')
  .post(validateByApiVersion(apiVersionedValidators.createUser), users.createUser);

router.route('/updateUser')
   .patch(validateByApiVersion(apiVersionedValidators.updateUser), users.updateUser);

router.route('/updatePassword')
   .patch(validateByApiVersion(apiVersionedValidators.updatePassword), users.updatePassword);

router.route('/updatePublicPreferences/:userId')
   .patch(validateByApiVersion(apiVersionedValidators.updateUserPublicPreferences), users.updatePublicPreferences);

router.route('/forgotPassword')
   .post(validateByApiVersion(apiVersionedValidators.forgotPassword), users.forgotPassword);

router.route('/resetPassword/:rid')
   .post(validateByApiVersion(apiVersionedValidators.resetPassword), users.resetPassword);

router.route('/getInvitations')
   .get(users.getInvitations);

router.route('/getSentInvitations')
   .get(users.getSentInvitations);

/*
router.route('/:userId')
  .put(users.update);

router.route('/passwordreset')
  .post(users.resetPassword);

router.route('/passwordupdate')
  .post(users.updatePassword);
*/

export default router;
