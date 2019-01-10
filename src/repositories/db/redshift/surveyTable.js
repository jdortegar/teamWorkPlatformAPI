import uuid from 'uuid';
import client from '../../../services/redshiftClient';
import config from '../../../config/env';

export const addSurvey = async (name) => {
    try {
        const id = uuid.v4();
        const query = `INSERT INTO ${config.redshift.tablePrefix}_surveys VALUES('${id}', '${name}')`;
        await client.query(query);
        return {
            id,
            name
        };
    } catch (err) {
        return Promise.reject(err);
    }
}

export const addQuestion = async (surveyId, question, options = []) => {
    try {
        const id = uuid.v4();
        const query = `INSERT INTO ${config.redshift.tablePrefix}_survey_questions VALUES('${id}', '${surveyId}', '${question}', '${options.join('|')}')`;
        await client.query(query);
        return {
            id,
            surveyId,
            question,
            options
        };
    } catch (err) {
        return Promise.reject(err);
    }
}

export const addAnswer = async (questionId, userId, orgId, answer) => {
    try {
        const id = uuid.v4();
        const query = `INSERT INTO ${config.redshift.tablePrefix}_survey_answers VALUES('${id}', '${questionId}', '${userId}', '${orgId}', '${answer}')`;
        await client.query(query);
        return {
            id,
            questionId,
            userId,
            orgId,
            answer,
        }
    } catch (err) {
        return Promise.reject(err);
    }
}