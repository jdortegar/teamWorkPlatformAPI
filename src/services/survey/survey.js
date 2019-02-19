import _ from 'lodash';
import moment from 'moment';
import * as surveyTable from '../../repositories/db/redshift/surveyTable';
import { SurveyNotExistsError } from '../errors';


// should return a promise.

export const createSurvey = async (params) => {
    try {
        const survey = await surveyTable.addSurvey(params.name, params.orgId, params.startDate, params.endDate);
        const surveyQuestions = [];
        for (let i =0; i < params.questions.length; i++) {
            const question = await surveyTable.addQuestion(survey.id, params.questions[i].value, params.questions[i].options);
            surveyQuestions.push(question);
        }
        return {
            id: survey.id,
            name: params.name,
            orgId: params.orgId,
            startDate: params.startDate,
            endDate: params.endDate,
            questions: surveyQuestions
        };
    } catch (err) {
        return Promise.reject(err);
    }
}

export const getSurveys = async (orgId) => {
    try {
        const surveys = await surveyTable.getSurveys(orgId);
        return surveys;

    } catch (err) {
        return Promise.reject(err);
    }
}

export const answerSurvey = async (surveyId, userId, orgId, answers) => {
    try {
        const survey = await surveyTable.getSurveyById(surveyId);
        if (!survey) {
            throw new SurveyNotExistsError(surveyId);
        }
        const promises = [];
        _.forEach(answers, (val) => {
            promises.push(surveyTable.addAnswer(val.questionId, userId, orgId, val.answer));
        });
        await Promise.all(promises);
        const result = {
            id: survey.id,
            name: survey.name,
            questions: []
        };
        _.forEach(answers, (val) => {
            const question = _.find(survey.questions, { id: val.questionId });

            result.questions.push({
                id: val.questionId,
                question: val.question,
                answer: val.answer
            });
        });
        return result;
    } catch (err) {
        return Promise.reject(err);
    }
}

export const getAnswers = async (orgId) => {
    try {
        const surveys = await surveyTable.getSurveyAnswers(orgId);
        return surveys;
    } catch (err) {
        return Promise.reject(err);
    }
}

export const updateSurvey = async (surveyId, startDate =null, endDate =null, name =null) => {
    try {
        const survey = await surveyTable.getSurveyById(surveyId);
        if (!survey) {
            throw new SurveyNotExistsError(surveyId);
        }
        const update = {};
        if (startDate) {
            update.start_date = startDate;
            survey.startDate = startDate
        }
        if (endDate) {
            update.end_date = endDate;
            survey.endDate = endDate;
        }
        if (name) {
            update.name = name;
            survey.name = name;
        }
        await surveyTable.updateSurvey(surveyId, update);
        return survey;
    } catch (err) {
        return Promise.reject(err);
    }
}

export const getLastSurveyDate = async (orgId, userId, surveyId) => {
    try {
        return await surveyTable.getLastSurveyDate(surveyId, orgId, userId);
    } catch (err) {
        console.log(err)
        return Promise.reject(err);
    }
}
