import express from  'express';
import * as survey from '../../controllers/api-v2/survey';

const router = express.Router();

router.route('/surveys')
    .post(survey.createSurvey);

router.route('/surveys')
    .get(survey.getSurveys);
// router.route('/organizations/:orgId/users/:userId/surveys')
//     .post(survey.createSurvey);

// router.route('/organizations/:orgId/users/:userId/surveys')
//     .get(survey.getSurveys);

// router.route('/organizations/:orgId/users/:userId/survey/date')
    // .get(survey.getLastSurveyDate);
    
export default router;
