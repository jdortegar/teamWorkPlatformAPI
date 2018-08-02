import ckgRoutes from './ckg';
import router from '../integrations';

router.use('/ckg', ckgRoutes);

export default router;