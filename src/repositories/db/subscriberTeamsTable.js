import _ from 'lodash';
import config from '../../config/env';
import * as util from './util';

const tableName = () => {
    return `${config.tablePrefix}subscriberTeams`;
}
const v = 1;

const upgradeSchema = (req, dbObjects) => {
    return Promixe.resolve(dbObjects);
}

const accessTokenRegex = /^access.*token$/i;
const refreshTokenRegex = /^refresh.*token$/i;

const decryptIntegration = (req, subscriberTeam) => {
    if (!subscriberTeam) {
        return undefined;
    }

    let decryptedSubscriberTeam = subscriberTeam;
    if ((subscriberTeam) && (subscriberTeam.integrations)) {
        decryptedSubscriberTeam = _.cloneDeep(subscriberTeam);
        Object.keys(subscriberTeam.integrations).forEach((integrationType) => {
            Object.keys(subscriberTeam.integrations[integrationType]).forEach((key) => {
                if ((accessTokenRegex.test(key)) || (refreshTokenRegex.test(key))) {
                    const currentValue = decryptedSubscriberTeam.integrations[integrationType][key];
                    decryptedSubscriberTeam.integrations[integrationType][key] = aes.decryptCiphers(currentValue);
                }
            });
        });
    }
    return decryptedSubscriberTeam;
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


export const createSubscriberTeam = (req, subscriberTeamId, userId, teamId, subscriberOrgId, role, displayName) => {
    const params = {
        TableName: tableName(),
        Item: {
            subscriberTeamId,
            v,
            userId,
            teamId,
            subscriberOrgId,
            role,
            enabled: true,
            displayName,
            created: req.now.format(),
            lastModified: req.now.format()
        }
    };
    return app.locals.docClient.put(params).promise();
};

export const getSubscriberTeamsByTeamId = async (req, teamId) => {
    const params = {
        TableName: tableName(),
        IndexName: 'teamIdIdx',
    }
    if (req.user.role === 'teamMember') {
        params.KeyConditionExpression = 'teamId = :teamId';
        params.ExprssionAttributeValues = {
            ':teamId': teamId
        };
    }

    const originalResults = await util.query(req, params);
    const latestResults = await upgradeSchema(req, originalResults);
    let decryptedResults;
    if (latestResults instanceof Array) {
        decryptedResults = _.map(latestResults, (val) => {
            decryptIntegration(val);
        });
    } else {
        decryptedResults = [decryptIntegration(latestResults)];
    }
    return decryptedResults;
}
