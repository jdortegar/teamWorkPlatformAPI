import uuid from 'uuid';
import _ from 'lodash';
import moment from 'moment';
import client from '../../../services/redshiftClient';
import config from '../../../config/env';

export const addSurvey = async (name, orgId, startDate, endDate) => {
    try {
        const id = uuid.v4();
        const query = `INSERT INTO ${config.redshift.tablePrefix}_surveys (id, name, start_date, end_date, org_id)
            VALUES('${id}', '${name}', '${startDate}', '${endDate}', '${orgId}')`;
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
        const formatedAnswer = (answer instanceof Array) ? answer.join('|') : answer;
        const query = `INSERT INTO ${config.redshift.tablePrefix}_survey_answers VALUES('${id}', '${questionId}', '${userId}', '${orgId}', '${formatedAnswer}')`;
        const status = await client.query(query);
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

export const getSurveys = async () => {
    try {
        const query = `SELECT s.id as survey_id, s.name, s.created_at, s.start_date, s.end_date, q.id as question_id, q.question, q.question_options as options
            FROM ${config.redshift.tablePrefix}_surveys s
            INNER JOIN ${config.redshift.tablePrefix}_survey_questions q ON s.id = q.survey_id;`;

        const rawData = await client.query(query);
        const formated = [];
        _.forEach(rawData.rows, (val) => {
            const ix = _.findIndex(formated, { id: val.survey_id });
            if (ix < 0) {
                formated.push({
                    id: val.survey_id,
                    name: val.name,
                    startDate: val.start_date,
                    endDate: val.end_date,
                    questions: [
                        {
                            id: val.question_id,
                            question: val.question,
                            options: (val.options.length > 0) ? val.options.split('|') : []
                        }
                    ]
                });
            } else {
                formated[ix].questions.push({
                    id: val.question_id,
                    question: val.question,
                    options: (val.options.length > 0) ? val.options.split('|') : []
                });
            }
        });
        return formated;
    } catch (err) {
        return Promise.reject(err);
    }
}

export const getSurveyById = async (id) => {
    try {
        const query = `SELECT s.id as survey_id, s.name, s.created_at, s.start_date, s.end_date, q.id as question_id, q.question, q.question_options as options
        FROM ${config.redshift.tablePrefix}_surveys s
        INNER JOIN ${config.redshift.tablePrefix}_survey_questions q ON s.id = q.survey_id
        WHERE s.id = '${id}'`;
        const rawData = await client.query(query);
        if (rawData.rows.length == 0) {
            return null;
        }
        const formated = {
            id: rawData.rows[0].survey_id,
            name: rawData.rows[0].name,
            startDate: rawData.rows[0].start_date,
            endDate: rawData.rows[0].end_date,
            questions: []
        }
        _.forEach(rawData.rows, (val) => {
            formated.questions.push({
                id: val.question_id,
                question: val.question,
                options: (val.options.length > 0) ? val.options.split('|') : []
            });
        });
        return formated;

    } catch (err) {
        return Promise.reject(err);
    }
}

export const getSurveyAnswers = async (orgId) => {
    try {
        const query = `SELECT s.id as survey_id, s.name, s.start_date, s.end_date,
            q.id as question_id, q.question,
            a.id as answer_id, a.answer, a.user_id, a.org_id, a.created_at
            FROM ${config.redshift.tablePrefix}_surveys s
            INNER JOIN ${config.redshift.tablePrefix}_survey_questions q ON s.id = q.survey_id
            INNER JOIN ${config.redshift.tablePrefix}_survey_answers a ON q.id = a.question_id
            WHERE s.org_id = '${orgId}'`
        const rawData = await client.query(query);
        const formated = [];
        _.forEach(rawData.rows, (val) => {
            const ix = _.findIndex(formated, {id: val.survey_id });
            if (ix < 0) {
                formated.push({
                    id: val.survey_id,
                    name: val.name,
                    questions: [
                        {
                            id: val.question_id,
                            question: val.question,
                            answer: val.answer,
                            orgId: val.org_id,
                            userId: val.user_id,
                            date: moment(val.created_at).format('YYYY-MM-DD')
                        }
                    ]
                });
            } else {
                formated[ix].questions.push({
                    id: val.question_id,
                    question: val.question,
                    answer: val.answer,
                    orgId: val.org_id,
                    userId: val.user_id,
                    date: moment(val.created_at).format('YYYY-MM-DD')
                });
            }
        });
        return formated;

    } catch (err) {
        return Promise.reject(err);
    }
}

export const updateSurvey = async (surveyId, update) => {
    try {
        const updateArray = [];
        _.forEach(update, (val, ix) => {
            updateArray.push(`${ix}='${val}'`)
        });
        const query = `UPDATE ${config.redshift.tablePrefix}_surveys SET ${updateArray.join(', ')} WHERE id = '${surveyId}'`;
        return await client.query(query);
    } catch (err) {
        return Promise.reject(err);
    }
}

export const getLastSurveyDate = async (surveyId, orgId, userId) => {
    try {
        const query = `SELECT MAX(a.created_at) as last_time FROM ${config.redshift.tablePrefix}_survey_answers a
            INNER JOIN ${config.redshift.tablePrefix}_survey_questions q ON q.id = a.question_id
            INNER JOIN ${config.redshift.tablePrefix}_surveys s ON s.id = q.survey_id
            WHERE s.id = '${surveyId}'`;
        const rawData = await client.query(query);
        if (rawData.rows.length == 0) {
            return null
        }
        return rawData.rows[0];
    } catch (err) {
        return Promise.reject(err);
    }

}
