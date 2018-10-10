import express from 'express';
import * as teams from '../../controllers/api-v2/teams';

const router = express.Router();

router.route('/organization/:orgId/teams/:teamId')
    .patch(teams.updateTeam);

export default router;