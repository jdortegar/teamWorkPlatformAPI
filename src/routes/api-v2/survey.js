import express from  'express';
import * as survey from '../../controllers/api-v2/survey';

const router = express.Router();

router.route('/organizations/:orgId/surveys')
    .post(survey.createSurvey);

router.route('/organizations/:orgId/surveys')
    .get(survey.getSurveys);

router.route('/organizations/:orgId/surveys/:surveyId/answers')
    .post(survey.answerSurvey)

router.route('/organizations/:orgId/surveys/:surveyId')
    .patch(survey.updateSurvey);
    
router.route('/organizations/:orgId/surveys/answers')
    .get(survey.getAnswers);

router.route('/organizations/:orgId/users/:userId/surveys/:surveyId/date')
    .get(survey.getLastSurveyDate)
    
    
export default router;
