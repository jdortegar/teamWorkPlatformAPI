import _ from 'lodash';
import uuid from 'uuid';
import config from '../config/env';
import {
   CannotDeactivateError,
   CannotInviteError,
   InvitationNotExistError,
   NoPermissionsError,
   NotActiveError,
   SubscriberOrgNotExistError,
   TeamExistsError,
   TeamNotExistError,
   UserNotExistError
} from './errors';
import InvitationKeys from '../repositories/InvitationKeys';
import * as invitationsTable from '../repositories/db/invitationsTable';
import * as usersTable from '../repositories/db/usersTable';
import { deleteInvitation } from '../repositories/cache/invitationsCache';
import { inviteExistingUsersToTeam } from './invitationsUtil';
import {
   teamCreated,
   teamMemberAdded,
   teamPrivateInfoUpdated,
   teamUpdated,
   userInvitationAccepted,
   userInvitationDeclined,
   sentInvitationStatus
} from './messaging';
import { getPresence } from './messaging/presence';
import Roles from './roles';
import * as teamRoomSvc from './teamRoomService';
import {
   createItem,
   getSubscriberOrgsByIds,
   getSubscriberUsersByUserIdAndSubscriberOrgId,
   getSubscriberUsersByUserIdAndSubscriberOrgIdAndRole,
   getSubscriberUsersByUserIds,
   getTeamMembersByUserIds,
   getTeamMembersBySubscriberUserIds,
   getTeamMembersByTeamIdAndUserIdAndRole,
   getTeamMembersByTeamId,
   getTeamsByIds,
   getTeamsBySubscriberOrgId,
   getTeamBySubscriberOrgIdAndName,
   getTeamBySubscriberOrgIdAndPrimary,
   updateItem
} from '../repositories/util';

export const defaultTeamName = 'All';

export function getUserTeams(req, userId, subscriberOrgId = undefined) {
   return new Promise((resolve, reject) => {
      getSubscriberUsersByUserIds(req, [userId])
         .then((subscriberUsers) => {
            let filteredSubscriberUsers;
            if (subscriberOrgId) {
               filteredSubscriberUsers = subscriberUsers.filter(subscriberUser => subscriberUser.subscriberUserInfo.subscriberOrgId === subscriberOrgId);
            } else {
               filteredSubscriberUsers = subscriberUsers;
            }
            const subscriberUserIds = filteredSubscriberUsers.map(subscriberUser => subscriberUser.subscriberUserId);
            return getTeamMembersBySubscriberUserIds(req, subscriberUserIds);
         })
         .then((teamMembers) => {
            const teamIds = teamMembers.map((teamMember) => {
               return teamMember.teamMemberInfo.teamId;
            });
            return getTeamsByIds(req, teamIds);
         })
         .then((teams) => {
            // Remove partitionId.
            const retTeams = [];
            teams.forEach((team) => {
               const teamClone = _.cloneDeep(team);
               delete teamClone.partitionId;
               teamClone.teamInfo.active =
                  (('subscriberOrgEnabled' in teamClone.teamInfo) && (teamClone.teamInfo.subscriberOrgEnabled === false))
                     ? false : teamClone.teamInfo.active;
               retTeams.push(teamClone);
            });
            resolve(retTeams);
         })
         .catch(err => reject(err));
   });
}

export const createTeamNoCheck = (req, subscriberOrgId, teamInfo, subscriberUserId, user, teamAdminUserIds, teamId = undefined) => {
   const actualTeamId = teamId || uuid.v4();
   const icon = teamInfo.icon || null;
   const preferences = teamInfo.preferences || { private: {} };
   if (preferences.private === undefined) {
      preferences.private = {};
   }
   preferences.iconColor = preferences.iconColor || '#FBBC12';
   const team = {
      subscriberOrgId,
      subscriberOrgEnabled: true,
      name: teamInfo.name,
      icon,
      active: true,
      primary: teamInfo.primary || false,
      preferences,
      created: req.now.format(),
      lastModified: req.now.format()
   };
   const teamMemberId = uuid.v4();

   return new Promise((resolve, reject) => {
      const role = Roles.admin;
      createItem(req, -1, `${config.tablePrefix}teams`, 'teamId', actualTeamId, 'teamInfo', team)
         .then(() => {
            const teamMember = {
               subscriberUserId,
               teamId: actualTeamId,
               userId: user.userId,
               role,
               created: req.now.format(),
               lastModified: req.now.format()
            };
            return createItem(req, -1, `${config.tablePrefix}teamMembers`, 'teamMemberId', teamMemberId, 'teamMemberInfo', teamMember);
         })
         .then(() => {
            team.teamId = actualTeamId;
            teamCreated(req, team, teamAdminUserIds);
            teamMemberAdded(req, actualTeamId, user, role, teamMemberId);

            const teamRoom = {
               name: teamRoomSvc.defaultTeamRoomName,
               purpose: undefined,
               publish: true,
               active: true,
               primary: true,
            };
            return teamRoomSvc.createTeamRoomNoCheck(req, subscriberOrgId, actualTeamId, teamRoom, teamMemberId, user, [user.userId]);
         })
         .then(() => resolve(team))
         .catch(err => reject(err));
   });
};

export function createTeam(req, subscriberOrgId, teamInfo, userId, teamId = undefined) {
   return new Promise((resolve, reject) => {
      let subscriberUserId;
      let subscriberOrgAdminUserIds;

      Promise.all([getSubscriberOrgsByIds(req, [subscriberOrgId]), getSubscriberUsersByUserIdAndSubscriberOrgIdAndRole(req, userId, subscriberOrgId, Roles.admin)])
         .then((promiseResults) => {
            const subscriberOrgs = promiseResults[0];
            const subscriberUsers = promiseResults[1];

            if (subscriberOrgs.length === 0) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }
            const subscriberOrg = subscriberOrgs[0];
            if (('enabled' in subscriberOrg) && (subscriberOrg.enabled === false)) {
               throw new NotActiveError(subscriberOrgId);
            }

            if (subscriberUsers.length === 0) {
               throw new NoPermissionsError(subscriberOrgId);
            }

            // Add all subscriberOrg admins to new team.
            const adminSubscriberUsers = subscriberUsers.filter(subscriberUser => subscriberUser.subscriberUserInfo.role === Roles.admin);
            subscriberOrgAdminUserIds = adminSubscriberUsers.map(adminSubscriberUser => adminSubscriberUser.subscriberUserInfo.userId);
            subscriberOrgAdminUserIds.push(userId);

            subscriberUserId = subscriberUsers[0].subscriberUserId;
            return Promise.all([
               getTeamBySubscriberOrgIdAndName(req, subscriberOrgId, teamInfo.name),
               usersTable.getUserByUserId(req, userId)
            ]);
         })
         .then((promiseResults) => {
            const existingTeams = promiseResults[0];
            const user = promiseResults[1];

            if (existingTeams.length > 0) {
               throw new TeamExistsError(teamInfo.name);
            }

            return createTeamNoCheck(req, subscriberOrgId, teamInfo, subscriberUserId, user, subscriberOrgAdminUserIds, teamId);
         })
         .then(team => resolve(team))
         .catch(err => reject(err));
   });
}

export function updateTeam(req, teamId, updateInfo, userId) {
   return new Promise((resolve, reject) => {
      const timestampedUpdateInfo = _.cloneDeep(updateInfo);
      timestampedUpdateInfo.lastModified = req.now.format();
      let dbTeam;
      getTeamsByIds(req, [teamId])
         .then((teams) => {
            if (teams.length === 0) {
               throw new TeamNotExistError(teamId);
            }

            dbTeam = teams[0];
            return getTeamMembersByTeamIdAndUserIdAndRole(req, teamId, userId, Roles.admin);
         })
         .then((teamMembers) => {
            if (teamMembers.length === 0) {
               throw new NoPermissionsError(teamId);
            }

            if ((dbTeam.teamInfo.primary) && (updateInfo.active === false)) {
               throw new CannotDeactivateError(teamId);
            }

            return updateItem(req, -1, `${config.tablePrefix}teams`, 'teamId', teamId, { teamInfo: timestampedUpdateInfo });
         })
         .then(() => {
            resolve();

            const team = dbTeam.teamInfo;
            const previousActive = team.active;
            _.merge(team, timestampedUpdateInfo); // Eventual consistency, so might be old.
            team.teamId = teamId;
            teamUpdated(req, team);
            if ((updateInfo.preferences) && (updateInfo.preferences.private)) {
               teamPrivateInfoUpdated(req, team);
            }

            if (('active' in updateInfo) && (previousActive !== updateInfo.active)) {
               // Enable/disable children.
               teamRoomSvc.setTeamRoomsOfTeamActive(req, teamId, updateInfo.active);
            }
         })
         .catch(err => reject(err));
   });
}

export function setTeamsOfSubscriberOrgActive(req, subscriberOrgId, active) {
   return new Promise((resolve, reject) => {
      const teams = [];
      getTeamsBySubscriberOrgId(req, subscriberOrgId)
         .then((dbTeams) => {
            const updateTeams = [];
            dbTeams.forEach((dbTeam) => {
               const { teamInfo } = dbTeam;
               teamInfo.subscriberOrgEnabled = active;
               updateTeams.push(updateItem(req, -1, `${config.tablePrefix}teams`, 'teamId', dbTeam.teamId, { teamInfo: { subscriberOrgEnabled: active } }));
               teams.push(_.merge({ teamId: dbTeam.teamId }, teamInfo));
            });
            return Promise.all(updateTeams);
         })
         .then(() => {
            const updateTeamRooms = [];
            teams.forEach((team) => {
               updateTeamRooms.push(teamRoomSvc.setTeamRoomsOfTeamActive(req, team.teamId, active));
            });
            return Promise.all(updateTeamRooms);
         })
         .then(() => {
            resolve();

            teams.forEach((team) => {
               teamUpdated(req, team);
            });
         })
         .catch(err => reject(err));
   });
}

/**
 * If the team doesn't exist, a TeamNotExistError is thrown.
 *
 * If userId is specified, an additional check is applied to confirm the user is actually a member of the team.
 * If userId is specified and the user is not a member of the team, a NoPermissionsError is thrown.
 *
 * @param req
 * @param teamId
 * @param userId Optional userId to return results only if the user is a team member.
 * @returns {Promise}
 */
export function getTeamUsers(req, teamId, userId = undefined) {
   const userIdsRoles = {};
   const userIdsTeamMemberIds = {};
   let usersWithRoles;

   return new Promise((resolve, reject) => {
      getTeamMembersByTeamId(req, teamId)
         .then((teamMembers) => {
            if (teamMembers.length === 0) {
               throw new TeamNotExistError(teamId);
            }

            const userIds = teamMembers.map((teamMember) => {
               userIdsRoles[teamMember.teamMemberInfo.userId] = teamMember.teamMemberInfo.role;
               userIdsTeamMemberIds[teamMember.teamMemberInfo.userId] = teamMember.teamMemberId;
               return teamMember.teamMemberInfo.userId;
            });
            if ((userId) && (userIds.indexOf(userId)) < 0) {
               throw new NoPermissionsError(teamId);
            }

            return usersTable.getUsersByUserIds(req, userIds);
         })
         .then((users) => {
            usersWithRoles = users.map((user) => {
               const ret = _.cloneDeep(user);
               ret.role = userIdsRoles[user.userId];
               ret.teamMemberId = userIdsTeamMemberIds[user.userId];
               return ret;
            });

            const presencePromises = [];
            usersWithRoles.forEach((userWithRoles) => {
               presencePromises.push(getPresence(req, userWithRoles.userId));
            });
            return Promise.all(presencePromises);
         })
         .then((presences) => {
            const userIdPresences = {};
            presences.forEach((presence) => {
               if ((presence) && (presence.length > 0)) {
                  const presenceNoUserIds = presence.map((p) => {
                     const presenceNoUserId = _.cloneDeep(p);
                     delete presenceNoUserId.userId;
                     return presenceNoUserId;
                  });
                  userIdPresences[presence[0].userId] = presenceNoUserIds;
               }
            });
            usersWithRoles = usersWithRoles.map((userWithRoles) => {
               const clone = _.cloneDeep(userWithRoles);
               clone.presence = userIdPresences[userWithRoles.userId];
               return clone;
            });
            resolve(usersWithRoles);
         })
         .catch(err => reject(err));
   });
}

export function inviteMembers(req, teamId, userIds, userId) {
   return new Promise((resolve, reject) => {
      let team;
      let inviteDbUsers;
      let dbUser;
      let subscriberOrg;
      Promise.all([
         getTeamsByIds(req, [teamId]),
         getTeamMembersByTeamIdAndUserIdAndRole(req, teamId, userId, Roles.admin)
      ])
         .then((promiseResults) => {
            const teams = promiseResults[0];
            const teamMembers = promiseResults[1];

            if (teams.length === 0) {
               throw new TeamNotExistError(teamId);
            }
            team = teams[0];

            if (teamMembers.length === 0) {
               throw new NoPermissionsError(teamId);
            }

            if ((('subscriberOrgEnabled' in team.teamInfo) && (team.teamInfo.subscriberOrgEnabled === false)) || (team.teamInfo.active === false)) {
               throw new CannotInviteError(teamId);
            }

            const uniqueUserIds = userIds.reduce((prevList, userIdEntry) => {
               if ((prevList.indexOf(userIdEntry) < 0) && (userIdEntry !== userId)) {
                  prevList.push(userIdEntry);
               }
               return prevList;
            }, []);

            if (uniqueUserIds.length === 0) {
               throw new CannotInviteError(userId);
            }

            return Promise.all([
               usersTable.getUsersByUserIds(req, [userId, ...uniqueUserIds]),
               getSubscriberOrgsByIds(req, [teams[0].teamInfo.subscriberOrgId])
            ]);
         })
         .then((promiseResults) => {
            const existingDbUsers = promiseResults[0].filter((existingDbUser) => {
               if (existingDbUser.userId === userId) {
                  dbUser = existingDbUser;
                  return false;
               }
               return true;
            });
            subscriberOrg = promiseResults[1][0];

            // If any of the userIds are bad, fail.
            if (existingDbUsers.length !== userIds.length) {
               throw new UserNotExistError();
            }

            // Make sure you don't invite yourself.
            inviteDbUsers = existingDbUsers.filter(existingDbUser => (existingDbUser.userId !== userId));
            const inviteDbUserIds = inviteDbUsers.map(inviteDbUser => inviteDbUser.userId);

            // Make sure invitees are not already in here.
            return getTeamMembersByUserIds(req, inviteDbUserIds);
         })
         .then((teamMembers) => {
            const teamMembersOfTeam = teamMembers.filter(teamMember => teamMember.teamMemberInfo.teamId === teamId);
            if (teamMembersOfTeam.length !== 0) {
               const doNotInviteUserIds = teamMembersOfTeam.map(teamMember => teamMember.teamMemberInfo.userId);
               inviteDbUsers = inviteDbUsers.filter(inviteDbUser => doNotInviteUserIds.indexOf(inviteDbUser.userId) < 0);
            }
            return inviteExistingUsersToTeam(req, dbUser, inviteDbUsers, subscriberOrg, team);
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
}

export function addUserToTeam(req, user, subscriberUserId, teamId, role) {
   return new Promise((resolve, reject) => {
      const teamMemberId = uuid.v4();
      getTeamsByIds(req, [teamId])
         .then((teams) => {
            if (teams.length === 0) {
               throw new TeamNotExistError(teamId);
            }

            const teamMember = {
               subscriberUserId,
               teamId,
               userId: user.userId,
               role,
               created: req.now.format(),
               lastModified: req.now.format()
            };
            return createItem(req, -1, `${config.tablePrefix}teamMembers`, 'teamMemberId', teamMemberId, 'teamMemberInfo', teamMember);
         })
         .then(() => {
            teamMemberAdded(req, teamId, user, role, teamMemberId);
            return teamRoomSvc.addUserToPrimaryTeamRoom(req, user, teamId, teamMemberId, Roles.user);
         })
         .then(() => resolve(teamMemberId))
         .catch(err => reject(err));
   });
}

export function addUserToPrimaryTeam(req, user, subscriberOrgId, subscriberUserId, role) {
   return new Promise((resolve, reject) => {
      let teamId;
      getTeamBySubscriberOrgIdAndPrimary(req, subscriberOrgId, true)
         .then((teams) => {
            if (teams.length > 0) {
               teamId = teams[0].teamId;
               return addUserToTeam(req, user, subscriberUserId, teamId, role);
            }
            return undefined;
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
}

export function replyToInvite(req, teamId, accept, userId) {
   return new Promise((resolve, reject) => {
      let user;
      let team;
      let cachedInvitation;
      Promise.all([usersTable.getUserByUserId(req, userId), getTeamsByIds(req, [teamId])])
         .then((promiseResults) => {
            user = promiseResults[0];
            const teams = promiseResults[1];

            if (!user) {
               throw new UserNotExistError();
            }

            if (teams.length === 0) {
               throw new TeamNotExistError(teamId);
            }
            team = teams[0];

            return deleteInvitation(req, user.emailAddress, InvitationKeys.teamId, teamId);
         })
         .then((retrievedCachedInvitation) => {
            cachedInvitation = retrievedCachedInvitation;
            if ((cachedInvitation) && ((!('subscriberOrgEnabled' in team.teamInfo)) || (team.teamInfo.subscriberOrgEnabled))) {
               if ((team.teamInfo.active) && (accept)) {
                  const { subscriberOrgId } = cachedInvitation;
                  userInvitationAccepted(req, cachedInvitation, userId);
                  return getSubscriberUsersByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId);
               } else if (!accept) {
                  userInvitationDeclined(req, cachedInvitation, userId);
               }
               return undefined;
            }
            throw new InvitationNotExistError(teamId);
         })
         .then((subscriberUsers) => {
            if ((subscriberUsers) && (subscriberUsers.length > 0)) {
               const { subscriberUserId } = subscriberUsers[0];
               return addUserToTeam(req, user, subscriberUserId, teamId, Roles.user);
            }
            return undefined;
         })
         .then(() => {
            const state = (accept) ? 'ACCEPTED' : 'DECLINED';
            return invitationsTable.updateInvitationsStateByInviteeEmail(req, user.emailAddress, InvitationKeys.teamId, teamId, state);
         })
         .then((invitation) => {
            resolve();
            sentInvitationStatus(req, invitation);
         })
         .catch(err => reject(err));
   });
}
