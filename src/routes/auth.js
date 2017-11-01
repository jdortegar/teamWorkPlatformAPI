//---------------------------------------------------------------------
// routes/auth.js
//
// route for /auth service
//---------------------------------------------------------------------
//  Date         Initials    Description
//  ----------   --------    ------------------------------------------
//  2017-02-02    RLA         Initial module creation
//
//---------------------------------------------------------------------

import express from 'express';
import { apiVersionedValidators, validateByApiVersion } from '../config/param-validation';
import * as auth from '../controllers/auth';

const router = express.Router();

router.route('/login')
   .post(validateByApiVersion(apiVersionedValidators.login), auth.login);

router.route('/logout')
   .get(auth.logout);

export default router;
