import express from 'express';
import * as teamRooms from '../controllers/teamRooms';

const router = express.Router();

router.route('/getTeamRooms')
  .get(teamRooms.getTeamRooms);

export default router;
