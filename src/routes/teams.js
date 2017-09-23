import express from 'express';
import { apiVersionedValidators, validateByApiVersion } from '../config/param-validation';
import * as teams from '../controllers/teams';

const router = express.Router();

router.route('/getTeams')
  .get(teams.getTeams);

router.route('/createTeam/:subscriberOrgId')
   .post(validateByApiVersion(apiVersionedValidators.createTeam), teams.createTeam);

router.route('/updateTeam/:teamId')
   .patch(validateByApiVersion(apiVersionedValidators.updateTeam), teams.updateTeam);

router.route('/getMembers/:teamId')
   .get(teams.getTeamMembers);

router.route('/inviteMembers/:teamId')
   .post(validateByApiVersion(apiVersionedValidators.inviteTeamMembers), teams.inviteMembers);

router.route('/replyToInvite/:teamId')
   .post(validateByApiVersion(apiVersionedValidators.replyToInvite), teams.replyToInvite);

export default router;
