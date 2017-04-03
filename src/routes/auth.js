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

import * as auth from '../controllers/auth';
import express from 'express';

const router = express.Router();

router.route('/')
  .post(auth.login);

export default router;

