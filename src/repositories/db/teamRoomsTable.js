import _ from 'lodash';
import config from '../../config/env';
import * as util from './util';
import { TeamRoomNotExistError } from '../../services/errors';


/**
 * hash: teamRoomId
 * v
 * teamId
 * subscriberOrgId
 * name
 * icon
 * primary
 * active
 * teamActive
 * created
 * lastModified
 * preferences
 *
 * GSI: teamIdUserIdIdx
 * hash: teamId
 * range: userId
 */
const tableName = () => {
   return `${config.tablePrefix}teamRooms`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const createTeamRoom = (req, teamRoomId, teamId, subscriberOrgId, name, icon, primary, preferences) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            teamRoomId,
            v,
            teamId,
            subscriberOrgId,
            name,
            icon,
            primary,
            active: true,
            teamActive: true,
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

export const getTeamRoomByTeamRoomId = (req, teamRoomId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'teamRoomId = :teamRoomId',
         ExpressionAttributeValues: {
            ':teamRoomId': teamRoomId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getTeamRoomsByTeamRoomIds = (req, teamRoomIds) => {
   return new Promise((resolve, reject) => {
      util.batchGet(req, tableName(), 'teamRoomId', teamRoomIds)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getTeamRoomByTeamIdAndName = (req, teamId, name) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'teamIdUserIdIdx',
         KeyConditionExpression: 'teamId = :teamId',
         FilterExpression: '#name = :name',
         ExpressionAttributeNames: {
            '#name': 'name'
         },
         ExpressionAttributeValues: {
            ':teamId': teamId,
            ':name': name
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const getTeamRoomByTeamIdAndPrimary = (req, teamId, primary) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'teamIdUserIdIdx',
         KeyConditionExpression: 'teamId = :teamId',
         FilterExpression: '#primary = :primary',
         ExpressionAttributeNames: {
            '#primary': 'primary'
         },
         ExpressionAttributeValues: {
            ':teamId': teamId,
            ':primary': primary
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

export const updateTeamRoom = (req, teamRoomId, { name, icon, primary, active, teamActive, preferences } = {}) => {
   return new Promise((resolve, reject) => {
      const lastModified = req.now.format();
      let teamRoom;
      getTeamRoomByTeamRoomId(req, teamRoomId)
         .then((retrievedTeamRoom) => {
            teamRoom = retrievedTeamRoom;
            if (!teamRoom) {
               throw new TeamRoomNotExistError(teamRoomId);
            }

            const params = {
               TableName: tableName(),
               Key: { teamRoomId },
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
               params.UpdateExpression += ', active = :active';
               params.ExpressionAttributeValues[':active'] = active;
            }
            if (_.isBoolean(teamActive)) {
               params.UpdateExpression += ', teamActive = :teamActive';
               params.ExpressionAttributeValues[':teamActive'] = teamActive;
            }
            if (preferences) {
               params.UpdateExpression += ', preferences = :preferences';
               params.ExpressionAttributeValues[':preferences'] = preferences;
            }

            return req.app.locals.docClient.update(params).promise();
         })
         .then(() => {
            resolve(_.merge({}, teamActive, {
               name,
               icon,
               primary,
               active,
               teamActive,
               lastModified,
               preferences
            }));
         })
         .catch(err => reject(err));
   });
};
