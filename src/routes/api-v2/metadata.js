import express from 'express';
import * as metadata from '../../controllers/api-v2/metadata';

const router = express.Router();

router.route('/metadata').get(metadata.getMeta);

export default router;
