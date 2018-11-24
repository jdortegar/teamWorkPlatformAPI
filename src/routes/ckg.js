import express from 'express';
import * as ckg from '../controllers/ckg';

const router = express.Router();

router.route('/getFiles/:subscriberOrgId?/:subscriberTeamId?')
  .get(ckg.getFiles);

router.route('/getFilesBySearchTerm/:subscriberOrgId?/:subscriberTeamId?/:searchTerm/:caseInsensitive?/:andOperator?')
  .get(ckg.getFilesBySearchTerm);
  
export default router;
