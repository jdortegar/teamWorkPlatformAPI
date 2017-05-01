import express from 'express';
import validate from 'express-validation';
import paramValidation from '../config/param-validation';
import * as teamRooms from '../controllers/teamRooms';

const router = express.Router();

router.route('/getTeamRooms')
  .get(teamRooms.getTeamRooms);

router.route('/createTeamRoom/:teamId')
   .post(validate(paramValidation.createTeamRoom), teamRooms.createTeamRoom);

// router.route('/updateTeamRoom/:teamId')
//    .patch(validate(paramValidation.updateTeamRoom), teamRooms.updateTeamRoom);

router.route('/getMembers/:teamRoomId')
   .get(teamRooms.getTeamRoomMembers);

export default router;
