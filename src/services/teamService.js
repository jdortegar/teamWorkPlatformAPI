import _ from 'lodash';
import uuid from 'uuid';
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
import * as subscriberOrgsTable from '../repositories/db/subscriberOrgsTable';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';
import * as teamsTable from '../repositories/db/teamsTable';
import * as teamMembersTable from '../repositories/db/teamMembersTable';
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

export const defaultTeamName = 'All';

export function getUserTeams(req, userId, subscriberOrgId = undefined) {
   return new Promise((resolve, reject) => {
      let promise;
      if (subscriberOrgId) {
         promise = teamMembersTable.getTeamMembersByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId);
      } else {
         promise = teamMembersTable.getTeamMembersByUserId(req, userId);
      }
      promise
         .then((teamMembers) => {
            const teamIds = teamMembers.map(teamMember => teamMember.teamId);
            return teamsTable.getTeamsByTeamIds(req, teamIds);
         })
         .then((teams) => {
            const retTeams = teams.map((team) => {
               const teamClone = _.cloneDeep(team);
               teamClone.active = (teamClone.subscriberOrgEnabled === false) ? false : teamClone.active;
               return teamClone;
            });
            resolve(retTeams);
         })
         .catch(err => reject(err));
   });
}

export const createTeamNoCheck = (req, subscriberOrgId, teamInfo, subscriberUserId, user, teamAdminUserIds, teamId = undefined) => {
   return new Promise((resolve, reject) => {
      const actualTeamId = teamId || uuid.v4();
      const icon = teamInfo.icon || null;
      const primary = (teamInfo.primary === undefined) ? false : teamInfo.primary;
      const preferences = teamInfo.preferences || { private: {} };
      if (preferences.private === undefined) {
         preferences.private = {};
      }
      preferences.iconColor = preferences.iconColor || '#FBBC12';
      let team;
      const teamMemberId = uuid.v4();
      const role = Roles.admin;

      teamsTable.createTeam(req, actualTeamId, subscriberOrgId, teamInfo.name, icon, primary, preferences)
         .then((createdTeam) => {
            team = createdTeam;

            return teamMembersTable.createTeamMember(req, teamMemberId, user.userId, actualTeamId, subscriberUserId, subscriberOrgId, Roles.admin);
         })
         .then(() => {
            teamCreated(req, team, teamAdminUserIds);
            teamMemberAdded(req, actualTeamId, user, role, teamMemberId);

            const teamRoom = {
               name: teamRoomSvc.defaultTeamRoomName,
               purpose: undefined,
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

      Promise.all([
         subscriberOrgsTable.getSubscriberOrgBySubscriberOrgId(req, subscriberOrgId),
         subscriberUsersTable.getSubscriberUsersBySubscriberOrgIdAndRole(req, subscriberOrgId, Roles.admin)
      ])
         .then(([subscriberOrg, subscriberUsers]) => {
            if (!subscriberOrg) {
               throw new SubscriberOrgNotExistError(subscriberOrgId);
            }
            if (subscriberOrg.enabled === false) {
               throw new NotActiveError(subscriberOrgId);
            }

            if (subscriberUsers.length === 0) {
               throw new NoPermissionsError(subscriberOrgId);
            }
            subscriberOrgAdminUserIds = subscriberUsers.map((adminSubscriberUser) => {
               if (adminSubscriberUser.userId === userId) {
                  subscriberUserId = adminSubscriberUser.subscriberUserId;
               }
               return adminSubscriberUser.userId;
            });
            if (!subscriberUserId) {
               throw new NoPermissionsError(subscriberOrgId);
            }

            return Promise.all([
               teamsTable.getTeamBySubscriberOrgIdAndName(req, subscriberOrgId, teamInfo.name),
               usersTable.getUserByUserId(req, userId)
            ]);
         })
         .then(([existingTeam, user]) => {
            if (existingTeam) {
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
      let originalTeam;
      teamsTable.getTeamByTeamId(req, teamId)
         .then((retrievedTeam) => {
            originalTeam = retrievedTeam;
            if (!originalTeam) {
               throw new TeamNotExistError(teamId);
            }

            return teamMembersTable.getTeamMemberByTeamIdAndUserIdAndRole(req, teamId, userId, Roles.admin);
         })
         .then((teamMember) => {
            if (!teamMember) {
               throw new NoPermissionsError(teamId);
            }

            if ((originalTeam.primary) && (updateInfo.active === false)) {
               throw new CannotDeactivateError(teamId);
            }

            const { name, icon, active, preferences } = updateInfo;
            return teamsTable.updateTeam(req, teamId, { name, icon, active, preferences });
         })
         .then((updatedTeam) => {
            resolve();

            const previousActive = originalTeam.active;
            const team = _.cloneDeep(updatedTeam);
            team.active = (team.subscriberOrgEnabled === false) ? false : team.active;
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
      let teams;
      teamsTable.updateTeamsBySubscriberOrgId(req, subscriberOrgId, { subscriberOrgEnabled: active })
         .then((updatedTeams) => {
            teams = updatedTeams;
            return Promise.all(teams.map(team => teamRoomSvc.setTeamRoomsOfTeamActive(req, team.teamId, active)));
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
      teamMembersTable.getTeamMembersByTeamId(req, teamId)
         .then((teamMembers) => {
            if (teamMembers.length === 0) {
               throw new TeamNotExistError(teamId);
            }

            const userIds = teamMembers.map((teamMember) => {
               userIdsRoles[teamMember.userId] = teamMember.role;
               userIdsTeamMemberIds[teamMember.userId] = teamMember.teamMemberId;
               return teamMember.userId;
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
         teamsTable.getTeamByTeamId(req, teamId),
         teamMembersTable.getTeamMemberByTeamIdAndUserIdAndRole(req, teamId, userId, Roles.admin)
      ])
         .then(([retrievedTeam, teamMember]) => {
            team = retrievedTeam;
            if (!team) {
               throw new TeamNotExistError(teamId);
            }

            if (!teamMember) {
               throw new NoPermissionsError(teamId);
            }

            if ((team.subscriberOrgEnabled === false) || (team.active === false)) {
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
               subscriberOrgsTable.getSubscriberOrgBySubscriberOrgId(req, team.subscriberOrgId)
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
            subscriberOrg = promiseResults[1];

            // If any of the userIds are bad, fail.
            if (existingDbUsers.length !== userIds.length) {
               throw new UserNotExistError();
            }

            // Make sure you don't invite yourself.
            inviteDbUsers = existingDbUsers.filter(existingDbUser => (existingDbUser.userId !== userId));
            const inviteDbUserIds = inviteDbUsers.map(inviteDbUser => inviteDbUser.userId);

            // Make sure invitees are not already in here.
            return teamMembersTable.getTeamMembersByUserIds(req, inviteDbUserIds);
         })
         .then((teamMembers) => {
            const teamMembersOfTeam = teamMembers.filter(teamMember => teamMember.teamId === teamId);
            if (teamMembersOfTeam.length !== 0) {
               const doNotInviteUserIds = teamMembersOfTeam.map(teamMember => teamMember.userId);
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
      teamsTable.getTeamByTeamId(req, teamId)
         .then((team) => {
            if (!team) {
               throw new TeamNotExistError(teamId);
            }
            return teamMembersTable.createTeamMember(req, teamMemberId, user.userId, teamId, subscriberUserId, team.subscriberOrgId, role);
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
      teamsTable.getTeamBySubscriberOrgIdAndPrimary(req, subscriberOrgId, true)
         .then((team) => {
            if (team) {
               return addUserToTeam(req, user, subscriberUserId, team.teamId, role);
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
      Promise.all([usersTable.getUserByUserId(req, userId), teamsTable.getTeamByTeamId(req, teamId)])
         .then(([retrievedUser, retrievedTeam]) => {
            user = retrievedUser;
            team = retrievedTeam;
            if (!user) {
               throw new UserNotExistError();
            }

            if (!team) {
               throw new TeamNotExistError(teamId);
            }

            return deleteInvitation(req, user.emailAddress, InvitationKeys.teamId, teamId);
         })
         .then((retrievedCachedInvitation) => {
            cachedInvitation = retrievedCachedInvitation;
            if ((cachedInvitation) && team.subscriberOrgEnabled) {
               if ((team.active) && (accept)) {
                  const { subscriberOrgId } = cachedInvitation;
                  userInvitationAccepted(req, cachedInvitation, userId);
                  return subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId);
               } else if (!accept) {
                  userInvitationDeclined(req, cachedInvitation, userId);
               }
               return undefined;
            }
            throw new InvitationNotExistError(teamId);
         })
         .then((subscriberUser) => {
            if (subscriberUser) {
               const { subscriberUserId } = subscriberUser;
               return addUserToTeam(req, user, subscriberUserId, teamId, Roles.user);
            }
            return undefined;
         })
         .then(() => {
            const state = (accept) ? 'ACCEPTED' : 'DECLINED';
            return invitationsTable.updateInvitationsStateByInviteeEmail(req, user.emailAddress, InvitationKeys.teamId, teamId, state);
         })
         .then((changedInvitations) => {
            resolve();
            sentInvitationStatus(req, changedInvitations);
         })
         .catch(err => reject(err));
   });
}
