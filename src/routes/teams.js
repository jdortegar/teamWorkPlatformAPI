import express from 'express';
import * as teams from '../controllers/teams';

const router = express.Router();

router.route('/getTeams')
  .get(teams.getTeams);

router.route('/getMembers/:teamId')
   .get(teams.getTeamMembers);

export default router;
