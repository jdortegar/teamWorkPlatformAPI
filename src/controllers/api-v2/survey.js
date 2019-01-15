import _ from 'lodash';
import httpStatus from 'http-status';
import moment from 'moment';
import * as surveySvc from '../../services/survey/survey';
import { SurveyNotExistsError } from '../../services/errors';

export const createSurvey = async (req, res, next) => {
    const name = req.body.name;
    const questions = req.body.questions;
    try {
        const survey = await surveySvc.createSurvey(name, questions);
        return res.status(httpStatus.CREATED).json(survey);
    } catch (err) {
        console.log(err);
        next(err);
    }
    // const orgId = req.params.orgId;
    // const userId = req.params.userId;
    // const answers = req.body;
    // const formatedAnswers = {};
    // _.forEach(answers, (val, key) => {
    //     formatedAnswers[key] = val.join(' | ');
    // });
    // try {
    //     await surveySvc.createSurvey(orgId, userId, formatedAnswers);
    //     return res.status(httpStatus.CREATED).json({
    //         organizationId: orgId,
    //         userId,
    //         answers: answers
    //     });
    // } catch (err) {
    //     next(err);
    // }
}

export const getLastSurveyDate = async (req, res, next) => {
    const orgId = req.params.orgId;
    const userId = req.params.userId;
    try {
        const result = await surveySvc.getLastSurveyDate(orgId, userId);
        if (result.rows.length > 0) {
            return res.status(httpStatus.OK).json({
                lastDate: moment(result.rows[0].last_time).format('YYYY-MM-DD')
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
        const { surveyId } = req.params;
        const { userId, orgId, answers } = req.body;
        const answer = await surveySvc.answerSurvey(surveyId, userId, orgId, answers);
        return res.status(httpStatus.CREATED).json(answer);
    } catch (err) {
        if (err instanceof SurveyNotExistsError) {
            return res.status(httpStatus.NOT_FOUND).json({
                error: 'Not found',
                message: `Survey not found with the id ${surveyId}`
            });
        }
        next(err);
    }
}