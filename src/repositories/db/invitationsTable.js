import _ from 'lodash';
import config from '../../config/env';
import * as util from './util';
import InvitationKeys from '../InvitationKeys';

/**
 * hash: inviterUserId
 * range: created
 * v
 * inviterFirstName
 * inviterLastName
 * inviterDisplayName
 * inviteeEmail
 * inviteeUserId
 * expires
 * state (null, ACCEPTED, DECLINED, EXPIRED)
 * lastModified
 * subscriberOrgId
 * subscriberOrgName
 * teamId (optional)
 * teamName (optional)
 *
 * GSI: inviteeEmailCreatedIdx
 * hash: inviteeEmail
 * range: created
 */
const tableName = () => {
   return `${config.tablePrefix}invitations`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
   // Nothing to upgrade.
   return Promise.resolve(dbObjects);
};

export const createInvitation = (req, inviterUserId, inviterFirstName, inviterLastName, inviterDisplayName, inviteeEmail, inviteeUserId, created, expires,
   { subscriberOrgId, subscriberOrgName, teamId = undefined, teamName = undefined }) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         Item: {
            inviterUserId,
            created: created.format(),
            v,
            inviterFirstName,
            inviterLastName,
            inviterDisplayName,
            inviteeEmail,
            inviteeUserId,
            expires: expires.format(),
            state: null,
            lastModified: req.now.format(),
            subscriberOrgId,
            subscriberOrgName,
            teamId,
            teamName
         }
      };

      req.app.locals.docClient.put(params).promise()
         .then(result => resolve(result.$response.request.rawParams.Item))
         .catch(err => reject(err));
   });
};

export const getInvitationByInviterUserIdAndCreated = (req, inviterUserId, created) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'inviterUserId = :inviterUserId and created = :created',
         ExpressionAttributeValues: {
            ':inviterUserId': inviterUserId,
            ':created': created
         }
      };

      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
         .catch(err => reject(err));
   });
};

/**
 *
 * @param req
 * @param invitation If undefined, it will be retrieved and then updated.
 * @param state
 * @param lastModified
 * @returns {Promise<any>}
 */
const updateInvitationState = (req, invitation, state, lastModified = undefined) => {
   const { inviterUserId, created } = invitation;
   const setLastModified = lastModified || req.now.format();
   const params = {
      TableName: tableName(),
      Key: { inviterUserId, created },
      UpdateExpression: 'set #state = :state, lastModified = :lastModified',
      ExpressionAttributeNames: {
         '#state': 'state'
      },
      ExpressionAttributeValues: {
         ':state': state,
         ':lastModified': setLastModified
      }
   };

   return new Promise((resolve, reject) => {
      req.app.locals.docClient.update(params).promise()
         .then(() => {
            resolve(_.merge({}, invitation, { state, lastModified }));
         })
         .catch(err => reject(err));
   });
};

const expireExpired = (req, invitations) => {
   return new Promise((resolve, reject) => {
      const now = req.now.format();
      const cleanInvitationPromises = invitations.map((invitation) => {
         if ((invitation.state === null) && (invitation.expires < now)) {
            return updateInvitationState(req, invitation, 'EXPIRED', invitation.expires);
         }
         return Promise.resolve(invitation);
      });
      Promise.all(cleanInvitationPromises)
         .then((cleanInvitations => resolve(cleanInvitations)))
         .catch(err => reject(err));
   });
};

export const getInvitationsByInviterUserId = (req, inviterUserId, { since = undefined, state = undefined }) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'inviterUserId = :inviterUserId',
         ExpressionAttributeValues: {
            ':inviterUserId': inviterUserId
         }
      };

      if (since) {
         params.KeyConditionExpression += ' and created >= :created';
         params.ExpressionAttributeValues[':created'] = since;
      }
      if (state) {
         params.FilterExpression = '#state = :state';
         params.ExpressionAttributeNames = { '#state': 'state' };
         params.ExpressionAttributeValues[':state'] = state;
      }

      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => expireExpired(req, latestResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

export const getInvitationsByInviteeEmail = (req, inviteeEmail) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'inviteeEmailCreatedIdx',
         KeyConditionExpression: 'inviteeEmail = :inviteeEmail',
         ExpressionAttributeValues: {
            ':inviteeEmail': inviteeEmail
         }
      };

      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => expireExpired(req, latestResults))
         .then(cleanResults => resolve(cleanResults))
         .catch(err => reject(err));
   });
};

export const getInvitationsByInviteeEmailAndState = (req, inviteeEmail, state) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'inviteeEmailStateIdx',
         KeyConditionExpression: 'inviteeEmail = :inviteeEmail',
         FilterExpression: '#state = :state',
         ExpressionAttributeNames: {
            '#state': 'state'
         },
         ExpressionAttributeValues: {
            ':inviteeEmail': inviteeEmail,
            ':state': state
         }
      };

      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => expireExpired(req, latestResults))
         .then(cleanResults => resolve(cleanResults))
         .catch(err => reject(err));
   });
};

export const updateInvitationsStateByInviteeEmail = (req, inviteeEmail, invitationKey, invitationValue, state) => {
   return new Promise((resolve, reject) => {
      getInvitationsByInviteeEmail(req, inviteeEmail)
         .then(allInvitations => expireExpired(req, allInvitations))
         .then((allInvitations) => {
            // Reduce to invitations to a specific org, team, or room.
            const invitations = allInvitations.filter((invitation) => {
               if (invitation.state === null) {
                  switch (invitationKey) {
                     case InvitationKeys.teamId:
                        return ((invitation[invitationKey] === invitationValue));
                     case InvitationKeys.subscriberOrgId:
                        return ((invitation[invitationKey] === invitationValue) && (!invitation.teamId));
                     default:
                  }
               }
               return false;
            });

            return Promise.all(invitations.map(invitation => updateInvitationState(req, invitation, state)));
         })
         .then(changedInvitations => resolve(changedInvitations))
         .catch(err => reject(err));
   });
};
