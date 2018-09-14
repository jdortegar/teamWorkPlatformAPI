// app/organization/:orgId/team/:teamId/integration/dropbox
// https://habla-fe-api-dev.habla.ai/v1/integrations/dropbox/revoke/34311c77-9b3b-43a9-8a4d-45766007a295?&team=1
import express from 'express';
import * as integrations from '../../controllers/api-v2/integrations';

const router = express.Router();

router.route('/organization/:orgId/team/:teamId/integrations')
    .get(integrations.getTeamIntegrations);

export default router;