import express from 'express';
import * as organization from '../../controllers/api-v2/organization';

const router = express.Router();

router.route('/organizations/:orgId')
    .get(organization.getOrganizationInfo);

export default router;
