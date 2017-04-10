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
import validate from 'express-validation';
import paramValidation from '../config/param-validation';
import * as auth from '../controllers/auth';

const router = express.Router();

router.route('/login')
   .post(validate(paramValidation.login), auth.login);

export default router;
