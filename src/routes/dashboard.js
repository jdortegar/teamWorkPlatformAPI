import express from 'express';
import * as dashboard from '../controllers/dashboard';

const router = express.Router();

router.route('/lamb-weston/report-a')
    .get(dashboard.getLambWestonReportA);

router.route('/lamb-weston/report-b')
    .get(dashboard.getLambWestonReportB);

router.route('/lamb-weston/report-c')
    .get(dashboard.getLambWestonReportC);

router.route('/lamb-weston/report-d')
    .get(dashboard.getLambWestonReportD);

router.route('/lamb-weston/report-e')
    .get(dashboard.getLambWestonReportE);

export default router;
