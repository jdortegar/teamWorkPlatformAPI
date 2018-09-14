import express from 'express';
import ckgRoutes from './ckg';
import surveyRoutes from './survey';
import integrationsV2Routes from './integrations';

const router = express.Router();

router.use('/ckg', ckgRoutes);
router.use(surveyRoutes);
router.use(integrationsV2Routes);

export default router;