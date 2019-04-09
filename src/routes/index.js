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
// import { containsAnyRole, containsRole, roles } from '../policies';
import subscriberOrgRoutes from './subscriberOrgs';
import teamsRoutes from './teams';
import userRoutes from './users';
import integrationRoutes from './integrations';
import dashboarRoutes from './dashboard';
import ckgRoutes from './ckg';

const router = express.Router();


/** GET /test - Check service health */
router.get('/test', (req, res) => {
   const response = {
      status: 'SUCCESS'
   };
   res.json(response);
});

// const isHablaUser = containsRole(roles.hablaUser);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/subscriberOrgs', subscriberOrgRoutes);
router.use('/teams', teamsRoutes);

router.use('/integrations', integrationRoutes);
router.use('/reports', dashboarRoutes);

router.use('/ckg', ckgRoutes);


export default router;

