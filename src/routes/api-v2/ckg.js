import express from 'express';
import * as ckg from '../../controllers/api-v2/ckg';
import { apiVersionedValidators, validateByApiVersion } from '../../config/param-validation';

const router = express.Router();

router.route('/:subscriberOrgId/files')
    .get(ckg.getFiles);

router.route('/:subscriberOrgId/files/:search')
    .put(validateByApiVersion(apiVersionedValidators.queryFiles), ckg.putQueryFiles);

router.route('/:subscriberOrgId/teams/:teamId/files/:search')
    .put(validateByApiVersion(apiVersionedValidators.queryFiles), ckg.putQueryFiles);

export default router;
