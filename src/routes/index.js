//---------------------------------------------------------------------
// routes/index.js
//
// default route handler for hablaapi service
//---------------------------------------------------------------------
//  Date         Initials    Description
//  ----------   --------    ------------------------------------------
//  2017-02-02    RLA         Initial module creation
//
//---------------------------------------------------------------------

import express from 'express';
import authRoutes from './auth';
import userRoutes from './user';
import teamsRoutes from './teams';
import { containsAnyRole, containsRole, roles } from '../policies';

const router = express.Router();


/** GET /test - Check service health */
router.get('/test', function(req, res) {
  const response = {
    status: 'SUCCESS'
  };
  res.json(response);
});

const isHablaUser = containsRole(roles.hablaUser);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/teams', teamsRoutes);

export default router;

