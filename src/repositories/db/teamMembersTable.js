import _ from 'lodash';
import config from '../../config/env';
import * as util from './util';

/**
 * hash: teamMemberId
 * v
 * userId
 * teamId
 * subscriberUserId
 * subscriberOrgId
 * role
 * enabled
 * created
 * lastModified
 *
 * GSI: teamIdUserIdIdx
 * hash: teamId
 * range: userId
 *
 * GSI: userIdSubscriberOrgIdIdx
 * hash: userId
 * range: subscriberOrgId
 */
const tableName = () => {
    return `${config.tablePrefix}teamMembers`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
    // Nothing to upgrade.
    return Promise.resolve(dbObjects);
};
const accessTokenRegex = /^access.*token$/i;
const refreshTokenRegex = /^refresh.*token$/i;

const decryptIntegration = (req, teamMember) => {
    if (!teamMember) {
        return undefined;
    }

    let decryptedTeamMember = teamMember;
    if ((teamMember) && (teamMember.integrations)) {
        decryptedTeamMember = _.cloneDeep(teamMember);
        Object.keys(teamMember.integrations).forEach((integrationType) => {
            Object.keys(teamMember.integrations[integrationType]).forEach((key) => {
                if ((accessTokenRegex.test(key)) || (refreshTokenRegex.test(key))) {
                    const currentValue = decryptedTeamMember.integrations[integrationType][key];
                    decryptedTeamMember.integrations[integrationType][key] = aes.decryptCiphers(currentValue);
                }
            });
        });
    }
    return decryptedTeamMember;
};

const encryptIntegrations = (req, integrations) => {
    if (!integrations) {
        return integrations;
    }

    const encryptedIntegrations = _.cloneDeep(integrations);
    Object.keys(integrations).forEach((integrationType) => {
        Object.keys(integrations[integrationType]).forEach((key) => {
            if ((accessTokenRegex.test(key)) || (refreshTokenRegex.test(key))) {
                const currentValue = integrations[integrationType][key];
                if (currentValue.indexOf(Aes.CIPHER_PATTERN_PREFIX) !== 0) {
                    // TODO: Turn this on when python code matches.
                    // encryptedIntegrations[integrationType][key] = aes.encryptCipher(currentValue);
                }
            }
        });
    });
    return encryptedIntegrations;
};

export const createTeamMember = (req, teamMemberId, userId, teamId, subscriberUserId, subscriberOrgId, role) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName(),
            Item: {
                teamMemberId,
                v,
                userId,
                teamId,
                subscriberUserId,
                subscriberOrgId,
                role,
                enabled: true,
                created: req.now.format(),
                lastModified: req.now.format()
            }
        };

        req.app.locals.docClient.put(params).promise()
            .then(result => resolve(result.$response.request.rawParams.Item))
            .catch(err => reject(err));
    });
};

export const getTeamMemberByTeamMemberId = (req, teamMemberId) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName(),
            KeyConditionExpression: 'teamMemberId = :teamMemberId',
            ExpressionAttributeValues: {
                ':teamMemberId': teamMemberId
            }
        };
        util.query(req, params)
            .then(originalResults => upgradeSchema(req, originalResults))
            .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
            .catch(err => reject(err));
    });
};

export const getTeamMembersByTeamId = async (req, teamId) => {
    const params = {
        TableName: tableName(),
        IndexName: 'teamIdUserIdIdx',
        KeyConditionExpression: 'teamId = :teamId',
        ExpressionAttributeValues: {
            ':teamId': teamId
        }
    };
    const originalResults = await util.query(req, params)
    const latestResults = await upgradeSchema(req, originalResults);
    let decryptedResults;
    if (latestResults instanceof Array) {
        decryptedResults = _.map(latestResults, (val) => {
            return decryptIntegration(val);
        });
    } else {
        decryptedResults = [decryptIntegration(latestResults)];
    }
    return decryptedResults;
};

export const getTeamMemberByTeamIdAndUserId = (req, teamId, userId) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName(),
            IndexName: 'teamIdUserIdIdx',
            KeyConditionExpression: 'teamId = :teamId and userId = :userId',
            ExpressionAttributeValues: {
                ':teamId': teamId,
                ':userId': userId
            }
        };
        util.query(req, params)
            .then(originalResults => upgradeSchema(req, originalResults))
            .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
            .catch(err => reject(err));
    });
};

export const getTeamMemberByTeamIdAndUserIdAndRole = (req, teamId, userId, role) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName(),
            IndexName: 'teamIdUserIdIdx',
            KeyConditionExpression: 'teamId = :teamId and userId = :userId',
            FilterExpression: '#role = :role',
            ExpressionAttributeNames: {
                '#role': 'role'
            },
            ExpressionAttributeValues: {
                ':teamId': teamId,
                ':userId': userId,
                ':role': role
            }
        };
        util.query(req, params)
            .then(originalResults => upgradeSchema(req, originalResults))
            .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
            .catch(err => reject(err));
    });
};

export const getTeamMembersByTeamIdAndRole = (req, teamId, role) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName(),
            IndexName: 'teamIdUserIdIdx',
            KeyConditionExpression: 'teamId = :teamId',
            FilterExpression: '#role = :role',
            ExpressionAttributeNames: {
                '#role': 'role'
            },
            ExpressionAttributeValues: {
                ':teamId': teamId,
                ':role': role
            }
        };
        util.query(req, params)
            .then(originalResults => upgradeSchema(req, originalResults))
            .then(latestResults => resolve(latestResults))
            .catch(err => reject(err));
    });
};

export const getTeamMembersByUserId = (req, userId) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName(),
            IndexName: 'userIdSubscriberOrgIdIdx',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            }
        };
        util.query(req, params)
            .then(originalResults => upgradeSchema(req, originalResults))
            .then(latestResults => resolve(latestResults))
            .catch(err => reject(err));
    });
};

export const getTeamMembersByUserIdAndSubscriberOrgId = (req, userId, subscriberOrgId) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName(),
            IndexName: 'userIdSubscriberOrgIdIdx',
            KeyConditionExpression: 'userId = :userId and subscriberOrgId = :subscriberOrgId',
            ExpressionAttributeValues: {
                ':userId': userId,
                ':subscriberOrgId': subscriberOrgId
            }
        };
        util.query(req, params)
            .then(originalResults => upgradeSchema(req, originalResults))
            .then(latestResults => resolve(latestResults))
            .catch(err => reject(err));
    });
};

export const updateTeamMembersIntegrations = async (req, userId, teamId, integrations) => {
    const lastModified = req.now.format();
    const teamMember = await getTeamMemberByTeamIdAndUserId(teamId, userId);
    const params = {
        TableName: tableName(),
        Key:  { teamMemberID: teamMember.teamMemberId },
        UpdateExpression: 'set lastModified = :lastModified, integrations = :integrations',
        ExpressionAttributeValues: {
            ':lastModified': lastModified,
            ':integrations': integrations
        }
    };
    await req.app.locals.docClient.update(params).promise();
    delete teamMember.integrations;
    return _.merge({}, teamMember, { integrations, lastModified });
}
