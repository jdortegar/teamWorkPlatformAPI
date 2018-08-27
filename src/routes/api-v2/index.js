import ckgRoutes from './ckg';
import surveyRoutes from './survey';
import router from '../integrations';

router.use('/ckg', ckgRoutes);
router.use(surveyRoutes);

export default router;