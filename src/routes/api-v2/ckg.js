import express from 'express';
import * as ckg from '../../controllers/api-v2/ckg';

const router = express.Router();

router.route('/:subscriberOrgId/files/:search')
    .get(ckg.getFiles);

export default router;
