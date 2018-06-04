import express from 'express';
import * as dashboard from '../controllers/dashboard';

const router = express.Router();

router.route('/lamb-weston/report-a')
    .get(dashboard.getLambWestonReportA);

export default router;
