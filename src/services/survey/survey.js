import _ from 'lodash';
import client from '../redshiftClient';
import config from '../../config/env';


// should return a promise.
export const createSurvey = (orgId, userId, questions = []) => {
    let questionsColumnsNames = '';
    let questionsVals = '';
    _.forEach(questions, (val, ix) => {
        questionsColumnsNames += `, question_${Number(ix) + 1}`;
        questionsVals += `, '${val}'`;
    });
    const query = `INSERT INTO ${config.surveyTable}(org_id, user_id${questionsColumnsNames}) VALUES('${orgId}', '${userId}'${questionsVals})`;
    return client.query(query);   
}

export const getLastSurveyDate = (orgId, userId) => {
    const query = `SELECT MAX(created_at) AS last_time FROM ${config.surveyTable}
    WHERE org_id='${orgId}' AND
    user_id = '${userId}'
    GROUP BY org_id, user_id`;
    return client.query(query);
}
