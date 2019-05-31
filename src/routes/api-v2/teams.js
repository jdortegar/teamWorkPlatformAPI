import express from 'express';
import { apiVersionedValidators, validateByApiVersion } from '../../config/param-validation';
import * as teams from '../../controllers/api-v2/teams';

const router = express.Router();

router.route('/organization/:orgId/teams/:teamId').patch(teams.updateTeam);

router.route('/organization/:orgId/teams/public').get(teams.publicTeams);

router.route('/organization/:orgId/teams').get(teams.getAllTeams);

router.route('/organization/:orgId/teams/public/:teamId/users/').get(teams.getPublicTeamMembers);

router.route('/organization/:orgId/teams/joinRequests/').get(teams.getRequests);

router.route('/organization/:orgId/teams/:teamId/joinRequests/').post(teams.joinRequest);

router.route('/organization/:orgId/teams/:teamId/joinRequests/').patch(teams.requestResponse);

router
   .route('/organization/:orgId/teams/:teamId/users/:userId')
   .patch(validateByApiVersion(apiVersionedValidators.updateTeamMember), teams.updateTeamMember);

export default router;
