import _ from 'lodash';
import config from '../../config/env';
import * as util from './util';
import { TeamNotExistError } from '../../services/errors';


/**
 * hash: teamId
 * v
 * subscriberOrgId
 * name
 * icon
 * primary
 * active
 * subscriberOrgEnabled
 * created
 * lastModified
 * preferences
 *
 * GSI: subscriberOrgIdIdx
 * hash: subscriberOrgId
 */
const tableName = () => {
   return `${config.tablePrefix}teams`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const createTeam = (req, teamId, subscriberOrgId, name, icon, primary, preferences) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            teamId,
            v,
            subscriberOrgId,
            name,
            icon,
            primary,
            active: true,
            subscriberOrgEnabled: true,
            created: req.now.format(),
            lastModified: req.now.format(),
            preferences
         }
      };

      req.app.locals.docClient.put(params).promise()
         .then(result => resolve(result.$response.request.rawParams.Item))
         .catch(err => reject(err));
   });
};

export const getTeamByTeamId = (req, teamId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'teamId = :teamId',
         ExpressionAttributeValues: {
            ':teamId': teamId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getTeamsByTeamIds = (req, teamIds) => {
   return new Promise((resolve, reject) => {
      util.batchGet(req, tableName(), 'teamId', teamIds)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getTeamsBySubscriberOrgId = (req, subscriberOrgId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'subscriberOrgIdIdx',
         KeyConditionExpression: 'subscriberOrgId = :subscriberOrgId',
         ExpressionAttributeValues: {
            ':subscriberOrgId': subscriberOrgId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getTeamBySubscriberOrgIdAndName = (req, subscriberOrgId, name) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'subscriberOrgIdIdx',
         KeyConditionExpression: 'subscriberOrgId = :subscriberOrgId',
         FilterExpression: '#name = :name',
         ExpressionAttributeNames: {
            '#name': 'name'
         },
         ExpressionAttributeValues: {
            ':subscriberOrgId': subscriberOrgId,
            ':name': name
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getTeamBySubscriberOrgIdAndPrimary = (req, subscriberOrgId, primary) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'subscriberOrgIdIdx',
         KeyConditionExpression: 'subscriberOrgId = :subscriberOrgId',
         FilterExpression: '#primary = :primary',
         ExpressionAttributeNames: {
            '#primary': 'primary'
         },
         ExpressionAttributeValues: {
            ':subscriberOrgId': subscriberOrgId,
            ':primary': primary
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const updateTeam = (req, teamId, { name, icon, primary, active, subscriberOrgEnabled, preferences } = {}) => {
   return new Promise((resolve, reject) => {
      const lastModified = req.now.format();
      let team;
      getTeamByTeamId(req, teamId)
         .then((retrievedTeam) => {
            team = retrievedTeam;
            if (!team) {
               throw new TeamNotExistError(teamId);
            }

            const params = {
               TableName: tableName(),
               Key: { teamId },
               UpdateExpression: 'set lastModified = :lastModified',
               ExpressionAttributeNames: {},
               ExpressionAttributeValues: {
                  ':lastModified': lastModified
               }
            };

            if (name) {
               params.UpdateExpression += ', #name = :name';
               params.ExpressionAttributeNames['#name'] = 'name';
               params.ExpressionAttributeValues[':name'] = name;
            }
            if (icon) {
               params.UpdateExpression += ', icon = :icon';
               params.ExpressionAttributeValues[':icon'] = icon;
            }
            if (_.isBoolean(primary)) {
               params.UpdateExpression += ', #primary = :primary';
               params.ExpressionAttributeNames['#primary'] = 'primary';
               params.ExpressionAttributeValues[':primary'] = primary;
            }
            if (_.isBoolean(active)) {
               params.UpdateExpression += ', #active = :active';
               params.ExpressionAttributeNames['#active'] = 'active';
               params.ExpressionAttributeValues[':active'] = active;
            }
            if (_.isBoolean(subscriberOrgEnabled)) {
               params.UpdateExpression += ', subscriberOrgEnabled = :subscriberOrgEnabled';
               params.ExpressionAttributeValues[':subscriberOrgEnabled'] = subscriberOrgEnabled;
            }
            if (preferences) {
               params.UpdateExpression += ', preferences = :preferences';
               params.ExpressionAttributeValues[':preferences'] = preferences;
            }

            return req.app.locals.docClient.update(params).promise();
         })
         .then(() => {
            resolve(_.merge({}, team, {
               name,
               icon,
               primary,
               active,
               subscriberOrgEnabled,
               lastModified,
               preferences
            }));
         })
         .catch(err => reject(err));
   });
};

export const updateTeamsBySubscriberOrgId = (req, subscriberOrgId, { active, subscriberOrgEnabled } = {}) => {
   return new Promise((resolve, reject) => {
      getTeamsBySubscriberOrgId(req, subscriberOrgId)
         .then((teams) => {
            return Promise.all(teams.map(team => updateTeam(req, team.teamId, { active, subscriberOrgEnabled })));
         })
         .then(teams => resolve(teams))
         .catch(err => reject(err));
   });
};
