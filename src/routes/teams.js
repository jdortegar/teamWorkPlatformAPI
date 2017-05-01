import express from 'express';
import validate from 'express-validation';
import paramValidation from '../config/param-validation';
import * as teams from '../controllers/teams';

const router = express.Router();

router.route('/getTeams')
  .get(teams.getTeams);

router.route('/createTeam/:subscriberOrgId')
   .post(validate(paramValidation.createTeam), teams.createTeam);

// router.route('/updateTeam/:subscriberOrgId')
//    .patch(validate(paramValidation.updateTeam), teams.updateTeam);

router.route('/getMembers/:teamId')
   .get(teams.getTeamMembers);

export default router;
