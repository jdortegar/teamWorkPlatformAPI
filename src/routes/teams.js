import express from 'express';
import validate from 'express-validation';
import paramValidation from '../config/param-validation';
import * as teams from '../controllers/teams';

const router = express.Router();

router.route('/getTeams')
  .get(teams.getTeams);

router.route('/createTeam/:subscriberOrgId')
   .post(validate(paramValidation.createTeam), teams.createTeam);

router.route('/updateTeam/:teamId')
   .patch(validate(paramValidation.updateTeam), teams.updateTeam);

router.route('/getMembers/:teamId')
   .get(teams.getTeamMembers);

router.route('/inviteMembers/:teamId')
   .post(validate(paramValidation.inviteTeamMembers), teams.inviteMembers);

router.route('/replyToInvite/:teamId')
   .post(validate(paramValidation.replyToInvite), teams.replyToInvite);

export default router;
