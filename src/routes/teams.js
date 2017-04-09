import express from 'express';
import * as teams from '../controllers/teams';

const router = express.Router();

router.route('/getTeams')
  .get(teams.getTeams);

export default router;
