import express from 'express';
import ckgRoutes from './ckg';
import surveyRoutes from './survey';
import integrationsV2Routes from './integrations';
import teamRoutes from './teams';
import organization from './organization';
import stripeRoutes from './stripe';
import conversationsRoutes from './conversations';
import paypalRoutes from './paypal';
import metadataRoutes from './metadata'

const router = express.Router();

router.use('/ckg', ckgRoutes);
router.use(organization);
router.use(surveyRoutes);
router.use(integrationsV2Routes);
router.use(teamRoutes);
router.use(stripeRoutes);
router.use(conversationsRoutes);
router.use(paypalRoutes);
router.use(metadataRoutes);

export default router;
