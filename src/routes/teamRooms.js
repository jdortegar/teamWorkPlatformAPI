import express from 'express';
import * as teamRooms from '../controllers/teamRooms';

const router = express.Router();

router.route('/getTeamRooms')
  .get(teamRooms.getTeamRooms);

router.route('/getMembers/:teamRoomId')
   .get(teamRooms.getTeamRoomMembers);

export default router;
