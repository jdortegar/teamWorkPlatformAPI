import _ from 'lodash';
import config from '../../config/env';
import * as surveyTable from '../../repositories/db/redshift/surveyTable';

// should return a promise.

export const createSurvey = async (name, questions) => {
    try {
        const survey = await surveyTable.addSurvey(name);
        const surveyQuestions = [];
        for (let i =0; i < questions.length; i++) {
            const question = await surveyTable.addQuestion(survey.id, questions[i].value, questions[i].options);
            surveyQuestions.push(question);
        }
        return {
            id: survey.id,
            name,
            questions: surveyQuestions
        };
    } catch (err) {
        return Promise.reject(err);
    }
} 

export const getSurveys = async () => {
    try {
        const surveys = await surveyTable.getSurveys();
        return surveys;

    } catch (err) {
        return Promise.reject(err);
    }
}

// export const createSurvey = (orgId, userId, questions = []) => {
//     let questionsColumnsNames = '';
//     let questionsVals = '';
//     _.forEach(questions, (val, ix) => {
//         questionsColumnsNames += `, question_${Number(ix) + 1}`;
//         questionsVals += `, '${val}'`;
//     });
//     const query = `INSERT INTO ${config.surveyTable}(org_id, user_id${questionsColumnsNames}) VALUES('${orgId}', '${userId}'${questionsVals})`;
//     return client.query(query);   
// }

// export const getLastSurveyDate = (orgId, userId) => {
//     const query = `SELECT MAX(created_at) AS last_time FROM ${config.surveyTable}
//     WHERE org_id='${orgId}' AND
//     user_id = '${userId}'
//     GROUP BY org_id, user_id`;
//     return client.query(query);
// }

// export const getSurveys = (orgId, userId) => {
//     const query = `SELECT org_id, user_id, created_at FROM ${config.surveyTable}
//         WHERE org_id = '${orgId}' AND 
//         user_id = '${userId}'
//         ORDER BY created_at`;
//     return client.query(query);
// }
