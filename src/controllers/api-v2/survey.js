import _ from 'lodash';
import httpStatus from 'http-status';
import moment from 'moment';
import * as surveySvc from '../../services/survey/survey';
import { SurveyNotExistsError } from '../../services/errors';

export const createSurvey = async (req, res, next) => {
    try {
        const params = {
            name: req.body.name,
            orgId: req.params.orgId,
            questions: req.body.questions,
            startDate: req.body.startDate,
            endDate: req.body.endDate
        }
        const survey = await surveySvc.createSurvey(params);
        return res.status(httpStatus.CREATED).json(survey);
    } catch (err) {
        console.log(err);
        next(err);
    }
 }

export const getLastSurveyDate = async (req, res, next) => {
    const orgId = req.params.orgId;
    const userId = req.params.userId;
    const surveyId = req.params.surveyId;
    try {
        const result = await surveySvc.getLastSurveyDate(orgId, userId, surveyId)

        if (result) {
            return res.status(httpStatus.OK).json({
                lastDate: moment(result.last_time).format('YYYY-MM-DD')
            });
        } else {
            return res.status(httpStatus.NOT_FOUND).json({
                error: 'Not Found',
                message: 'No surveys found for given orgId and userId'
            });
        }
    } catch (err) {
        next(err);
    }
}

export const getSurveys = async (req, res, next) => {
    try {
        const surveys = await surveySvc.getSurveys();
        return res.json(surveys);
    } catch (err) {
        console.log(err);
        next(err);
    }
}

export const answerSurvey = async (req, res, next) => {

    try {
        const { surveyId, orgId } = req.params;
        const { userId, answers } = req.body;
        const answer = await surveySvc.answerSurvey(surveyId, userId, orgId, answers);
        return res.status(httpStatus.CREATED).json(answer);
    } catch (err) {
        console.log(err);
        if (err instanceof SurveyNotExistsError) {
            return res.status(httpStatus.NOT_FOUND).json({
                error: 'Not found',
                message: `Survey not found with the id ${surveyId}`
            });
        }
        next(err);
    }
}

export const getAnswers = async (req, res, next) => {
    try {
        const { orgId } = req.params;
        const answers = await surveySvc.getAnswers(orgId);
        return res.json(answers);
    } catch (err) {
        next(err);
    }
}

export const updateSurvey = async (req, res, next) => {
    try {
        const surveyId = req.params.surveyId
        const startDate = req.body.startDate || null;
        const endDate = req.body.endDate || null;
        const name = req.body.name || null;
        const updatedSurvey = await surveySvc.updateSurvey(surveyId, startDate, endDate, name);
        return res.json(updatedSurvey);
    } catch (err) {
        console.log(err);
        if (err instanceof SurveyNotExistsError) {
            return res.status(httpStatus.NOT_FOUND).json({
                error: 'Not Found',
                message: `survey not found with the id ${surveyId}`
            });
        } else {
            next(err);
        }
    }
}