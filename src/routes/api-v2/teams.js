import express from 'express';
import { apiVersionedValidators, validateByApiVersion } from '../../config/param-validation';
import * as teams from '../../controllers/api-v2/teams';

const router = express.Router();

router.route('/organization/:orgId/teams/:teamId').patch(teams.updateTeam);

router
   .route('/organization/:orgId/teams/:teamId/users/:userId')
   .patch(validateByApiVersion(apiVersionedValidators.updateTeamMember), teams.updateTeamMember);

export default router;
