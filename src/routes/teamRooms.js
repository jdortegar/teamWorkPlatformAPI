import express from 'express';
import { apiVersionedValidators, validateByApiVersion } from '../config/param-validation';
import * as teamRooms from '../controllers/teamRooms';

const router = express.Router();

router.route('/getTeamRooms')
  .get(teamRooms.getTeamRooms);

router.route('/createTeamRoom/:teamId')
   .post(validateByApiVersion(apiVersionedValidators.createTeamRoom), teamRooms.createTeamRoom);

router.route('/updateTeamRoom/:teamRoomId')
   .patch(validateByApiVersion(apiVersionedValidators.updateTeamRoom), teamRooms.updateTeamRoom);

router.route('/getMembers/:teamRoomId')
   .get(teamRooms.getTeamRoomMembers);

router.route('/inviteMembers/:teamRoomId')
   .post(validateByApiVersion(apiVersionedValidators.inviteTeamRoomMembers), teamRooms.inviteMembers);

router.route('/replyToInvite/:teamRoomId')
   .post(validateByApiVersion(apiVersionedValidators.replyToInvite), teamRooms.replyToInvite);

export default router;
