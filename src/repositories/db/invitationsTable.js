import _ from 'lodash';
import config from '../../config/env';
import * as util from './util';

/**
 * hash: inviterUserId
 * range: created
 * v
 * inviterFirstName
 * inviterLastName
 * inviterDisplayName
 * inviteeEmail
 * expires
 * state (null, ACCEPTED, DECLINED, EXPIRED)
 * lastModified
 * subscriberOrgId
 * subscriberOrgName
 * teamId (optional)
 * teamName (optional)
 * teamRoomId (optional)
 * teamRoomName (optional)
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

export const createInvitation = (req, inviterUserId, inviterFirstName, inviterLastName, inviterDisplayName, inviteeEmail, created, expires,
   { subscriberOrgId, subscriberOrgName, teamId = undefined, teamName = undefined, teamRoomId = undefined, teamRoomName = undefined }) => {
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
            expires: expires.format(),
            state: null,
            lastModified: req.now.format(),
            subscriberOrgId,
            subscriberOrgName,
            teamId,
            teamName,
            teamRoomId,
            teamRoomName
         }
      };

      req.app.locals.docClient.put(params).promise()
         .then(result => resolve(result.$response.request.rawParams.Item))
         .catch(err => reject(err));
   });
};

export const updateInvitationStateByInviterUserIdAndCreated = (req, inviterUserId, created, state, lastModified = undefined) => {
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
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

export const updateInvitationState = (req, invitation, state, lastModified = undefined) => {
   const { inviterUserId, created } = invitation;
   const setLastModified = lastModified || req.now.format();
   const params = {
      TableName: tableName(),
      Key: { inviterUserId, created },
      UpdateExpression: 'set state = :state, lastModified = :lastModified',
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

export const getInvitationsByInviterUserId = (req, inviterUserId) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         KeyConditionExpression: 'inviterUserId = :inviterUserId',
         ExpressionAttributeValues: {
            ':inviterUserId': inviterUserId
         }
      };
      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => resolve(latestResults))
         .catch(err => reject(err));
   });
};

const expireExpired = (req, invitations) => {
   return new Promise((resolve, reject) => {
      const now = req.now.format();
      const cleanInvitationPromises = invitations.map((invitation) => {
         if (invitation.expires < now) {
            return updateInvitationState(req, invitation, 'EXPIRED', invitation.expires);
         }
         return Promise.resolve(invitation);
      });
      Promise.all(cleanInvitationPromises)
         .then((cleanInvitations => resolve(cleanInvitations)))
         .catch(err => reject(err));
   });
};

export const getInvitationsByInviteeEmail = (req, inviteeEmail) => {
   return new Promise((resolve, reject) => {
      const params = {
         TableName: tableName(),
         IndexName: 'inviteeEmailStateIdx',
         KeyConditionExpression: 'inviteeEmail = :inviteeEmail',
         ExpressionAttributeValues: {
            ':inviteeEmail': inviteeEmail
         }
      };

      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => expireExpired(latestResults))
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
         FilterExpression: 'state = :state',
         ExpressionAttributeValues: {
            ':inviteeEmail': inviteeEmail,
            ':state': state
         }
      };

      util.query(req, params)
         .then(originalResults => upgradeSchema(req, originalResults))
         .then(latestResults => expireExpired(latestResults))
         .then(cleanResults => resolve(cleanResults))
         .catch(err => reject(err));
   });
};
