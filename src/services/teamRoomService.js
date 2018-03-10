import _ from 'lodash';
import uuid from 'uuid';
import * as subscriberOrgsTable from '../repositories/db/subscriberOrgsTable';
import * as teamsTable from '../repositories/db/teamsTable';
import * as teamRoomsTable from '../repositories/db/teamRoomsTable';
import * as conversationSvc from './conversationService';
import {
   CannotDeactivateError,
   CannotInviteError,
   InvitationNotExistError,
   NoPermissionsError,
   NotActiveError,
   TeamNotExistError,
   TeamRoomExistsError,
   TeamRoomNotExistError,
   UserNotExistError,
   TeamRoomMemberExistsError
} from './errors';
import InvitationKeys from '../repositories/InvitationKeys';
import * as invitationsTable from '../repositories/db/invitationsTable';
import * as usersTable from '../repositories/db/usersTable';
import * as teamMembersTable from '../repositories/db/teamMembersTable';
import * as teamRoomMembersTable from '../repositories/db/teamRoomMembersTable';
import { deleteInvitation } from '../repositories/cache/invitationsCache';
import { inviteExistingUsersToTeamRoom } from './invitationsUtil';
import {
   teamRoomCreated,
   teamRoomMemberAdded,
   teamRoomPrivateInfoUpdated,
   teamRoomUpdated,
   userInvitationAccepted,
   userInvitationDeclined,
   sentInvitationStatus
} from './messaging';
import { getPresence } from './messaging/presence';
import Roles from './roles';

export const defaultTeamRoomName = 'Lobby';

export const getUserTeamRooms = (req, userId, { teamId, subscriberOrgId } = {}) => {
   return new Promise((resolve, reject) => {
      let promise;
      if (teamId) {
         promise = teamRoomMembersTable.getTeamRoomMembersByUserIdAndTeamId(req, userId, teamId);
      } else if (subscriberOrgId) {
         promise = teamRoomMembersTable.getTeamRoomMembersByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId);
      } else {
         promise = teamRoomMembersTable.getTeamRoomMembersByUserId(req, userId);
      }

      promise
         .then((teamRoomMembers) => {
            const teamRoomIds = teamRoomMembers.map(teamRoomMember => teamRoomMember.teamRoomId);
            return teamRoomsTable.getTeamRoomsByTeamRoomIds(req, teamRoomIds);
         })
         .then((retrievedTeamRooms) => {
            const teamRooms = retrievedTeamRooms.map((teamRoom) => {
               const teamRoomClone = _.cloneDeep(teamRoom);
               teamRoomClone.active = (teamRoomClone.teamActive === false) ? false : teamRoomClone.active;
               return teamRoomClone;
            });
            resolve(teamRooms);
         })
         .catch(err => reject(err));
   });
};

export const createTeamRoomNoCheck = (req, subscriberOrgId, subscriberUserId, teamId, teamRoomInfo, teamMemberId, user, teamRoomAdminUserIds, teamRoomId = undefined) => {
   return new Promise((resolve, reject) => {
      const actualTeamRoomId = teamRoomId || uuid.v4();
      const icon = teamRoomInfo.icon || null;
      const preferences = teamRoomInfo.preferences || { private: {} };
      if (preferences.private === undefined) {
         preferences.private = {};
      }
      preferences.iconColor = preferences.iconColor || '#557DBF'; // default color for team room
      const teamRoomMemberId = uuid.v4();
      const role = Roles.admin;
      let teamRoom;

      teamRoomsTable.createTeamRoom(req, actualTeamRoomId, teamId, subscriberOrgId, teamRoomInfo.name, icon, teamRoomInfo.primary || false, preferences)
         .then((createdTeamRoom) => {
            teamRoom = createdTeamRoom;
            return teamRoomMembersTable.createTeamRoomMember(req, teamRoomMemberId, user.userId, actualTeamRoomId, teamMemberId, teamId, subscriberUserId, subscriberOrgId, role);
         })
         .then(() => {
            teamRoomCreated(req, teamRoom, teamRoomAdminUserIds);
            teamRoomMemberAdded(req, teamRoom, user, role, teamRoomMemberId);

            return conversationSvc.createConversationNoCheck(req, subscriberOrgId, actualTeamRoomId, user.userId, teamRoomAdminUserIds);
         })
         .then(() => resolve(teamRoom))
         .catch(err => reject(err));
   });
};

export const createTeamRoom = (req, teamId, teamRoomInfo, userId, teamRoomId = undefined) => {
   return new Promise((resolve, reject) => {
      let subscriberOrgId;
      let teamMemberId;
      let teamAdminUserIds;
      let subscriberUserId;

      Promise.all([teamsTable.getTeamByTeamId(req, teamId), teamMembersTable.getTeamMembersByTeamIdAndRole(req, teamId, Roles.admin)])
         .then(([team, adminTeamMembers]) => {
            if (!team) {
               throw new TeamNotExistError(teamId);
            }
            subscriberOrgId = team.subscriberOrgId;
            if ((team.subscriberOrgEnabled === false) || (team.active === false)) {
               throw new NotActiveError(teamId);
            }

            if (adminTeamMembers.length === 0) {
               throw new NoPermissionsError(teamId);
            }

            // Add all team admins to new team room.
            teamAdminUserIds = adminTeamMembers.map(adminTeamMember => adminTeamMember.userId);

            teamMemberId = adminTeamMembers.reduce((prevValue, adminTeamMember) => {
               let newValue;
               if ((!prevValue) && (adminTeamMember.userId === userId)) {
                  newValue = adminTeamMember.teamMemberId;
                  subscriberUserId = adminTeamMember.subscriberUserId;
               }
               return newValue;
            }, undefined);
            return Promise.all([
               teamRoomsTable.getTeamRoomByTeamIdAndName(req, teamId, teamRoomInfo.name),
               usersTable.getUserByUserId(req, userId)
            ]);
         })
         .then(([teamRoom, user]) => {
            if (teamRoom) {
               throw new TeamRoomExistsError(teamRoomInfo.name);
            }

            return createTeamRoomNoCheck(req, subscriberOrgId, subscriberUserId, teamId, teamRoomInfo, teamMemberId, user, teamAdminUserIds, teamRoomId);
         })
         .then(teamRoom => resolve(teamRoom))
         .catch(err => reject(err));
   });
};

export const updateTeamRoom = (req, teamRoomId, updateInfo, userId) => {
   return new Promise((resolve, reject) => {
      let previousActive;
      Promise.all([
         teamRoomsTable.getTeamRoomByTeamRoomId(req, teamRoomId),
         teamRoomMembersTable.getTeamRoomMemberByTeamRoomIdAndUserIdAndRole(req, teamRoomId, userId, Roles.admin)
      ])
         .then(([teamRoom, teamRoomMember]) => {
            if (!teamRoom) {
               throw new TeamRoomNotExistError(teamRoomId);
            }

            if (!teamRoomMember) {
               throw new NoPermissionsError(teamRoomId);
            }

            if ((teamRoom.primary) && (updateInfo.active === false)) {
               throw new CannotDeactivateError(teamRoomId);
            }
            previousActive = teamRoom.active;

            if ((updateInfo.name) && (teamRoom.name !== updateInfo.name)) {
               return teamRoomsTable.getTeamRoomByTeamIdAndName(req, teamRoom.teamId, updateInfo.name);
            }
            return undefined;
         })
         .then((duplicateName) => {
            if (duplicateName) {
               throw new TeamRoomExistsError(updateInfo.name);
            }

            const { name, icon, primary, active, teamActive, preferences } = updateInfo;
            return teamRoomsTable.updateTeamRoom(req, teamRoomId, { name, icon, primary, active, teamActive, preferences });
         })
         .then((teamRoom) => {
            resolve();

            teamRoomUpdated(req, teamRoom);
            if ((updateInfo.preferences) && (updateInfo.preferences.private)) {
               teamRoomPrivateInfoUpdated(req, teamRoom);
            }

            if (('active' in updateInfo) && (previousActive !== updateInfo.active)) {
               // Enable/disable children. Um, no children for this.
               conversationSvc.setConversationOfTeamRoomActive(req, teamRoomId, updateInfo.active);
            }
         })
         .catch(err => reject(err));
   });
};

export const setTeamRoomsOfTeamActive = (req, teamId, active) => {
   return new Promise((resolve, reject) => {
      let updatedTeamRooms;
      teamRoomsTable.getTeamRoomsByTeamId(req, teamId)
         .then((teamRooms) => {
            return Promise.all(teamRooms.map((teamRoom) => {
               return teamRoomsTable.updateTeamRoom(req, teamRoom.teamRoomId, { teamActive: active });
            }));
         })
         .then((teamRooms) => {
            updatedTeamRooms = teamRooms;
            return Promise.all(teamRooms.map((teamRoom) => {
               return conversationSvc.setConversationOfTeamRoomActive(req, teamRoom.teamRoomId, active);
            }));
         })
         .then(() => {
            resolve();

            updatedTeamRooms.forEach(teamRoom => teamRoomUpdated(req, teamRoom));
         })
         .catch(err => reject(err));
   });
};

/**
 * If the team room doesn't exist, a TeamRoomNotExistError is thrown.
 *
 * If userId is specified, an additional check is applied to confirm the user is actually a member of the team room.
 * If userId is specified and the user is not a member of the team room, a NoPermissionsError is thrown.
 *
 * @param req
 * @param teamRoomId
 * @param userId Optional userId to return results only if the user is a team room member.
 * @returns {Promise}
 */
export const getTeamRoomUsers = (req, teamRoomId, userId = undefined) => {
   const userIdsRoles = {};
   const userIdsTeamRoomMemberIds = {};
   let usersWithRoles;

   return new Promise((resolve, reject) => {
      teamRoomMembersTable.getTeamRoomMembersByTeamRoomId(req, teamRoomId)
         .then((teamRoomMembers) => {
            if (teamRoomMembers.length === 0) {
               throw new TeamRoomNotExistError(teamRoomId);
            }

            const userIds = teamRoomMembers.map((teamRoomMember) => {
               userIdsRoles[teamRoomMember.userId] = teamRoomMember.role;
               userIdsTeamRoomMemberIds[teamRoomMember.userId] = teamRoomMember.teamRoomMemberId;
               return teamRoomMember.userId;
            });
            if ((userId) && (userIds.indexOf(userId)) < 0) {
               throw new NoPermissionsError(teamRoomId);
            }

            return usersTable.getUsersByUserIds(req, userIds);
         })
         .then((users) => {
            usersWithRoles = users.map((user) => {
               const ret = _.cloneDeep(user);
               ret.role = userIdsRoles[user.userId];
               ret.teamRoomMemberId = userIdsTeamRoomMemberIds[user.userId];
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
};

export const inviteMembers = (req, teamRoomId, userIds, userId) => {
   let teamRoom;
   let team;
   let inviteDbUsers;
   let dbUser;
   let subscriberOrg;
   return new Promise((resolve, reject) => {
      Promise.all([
         teamRoomsTable.getTeamRoomByTeamRoomId(req, teamRoomId),
         teamRoomMembersTable.getTeamRoomMemberByTeamRoomIdAndUserIdAndRole(req, teamRoomId, userId, Roles.admin)
      ])
         .then((promiseResults) => {
            teamRoom = promiseResults[0];
            const teamRoomMember = promiseResults[1];
            if (!teamRoom) {
               throw new TeamRoomNotExistError(teamRoomId);
            }

            if (!teamRoomMember) {
               throw new NoPermissionsError(teamRoomId);
            }

            if ((teamRoom.teamActive === false) || (teamRoom.active === false)) {
               throw new CannotInviteError(teamRoomId);
            }

            return teamsTable.getTeamByTeamId(req, teamRoom.teamId);
         })
         .then((retrievedTeam) => {
            team = retrievedTeam;
            const uniqueUserIds = userIds.reduce((prevList, userIdEntry) => {
               if (prevList.indexOf(userIdEntry) < 0) {
                  prevList.push(userIdEntry);
               }
               return prevList;
            }, []);

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
            return teamRoomMembersTable.getTeamRoomMembersByUserIdsAndTeamRoomId(req, inviteDbUserIds, teamRoomId);
         })
         .then((teamRoomMembers) => {
            if (teamRoomMembers.length !== 0) {
               const doNotInviteUserIds = teamRoomMembers.map(teamRoomMember => teamRoomMember.userId);
               inviteDbUsers = inviteDbUsers.filter(inviteDbUser => doNotInviteUserIds.indexOf(inviteDbUser.userId) < 0);
            }
            return inviteExistingUsersToTeamRoom(req, dbUser, inviteDbUsers, subscriberOrg, team, teamRoom);
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

export const addUserToTeamRoom = (req, user, teamId, teamMemberId, teamRoomId, role) => {
   return new Promise((resolve, reject) => {
      let teamRoom;
      const teamRoomMemberId = uuid.v4();
      Promise.all([
         teamRoomsTable.getTeamRoomByTeamRoomId(req, teamRoomId),
         teamMembersTable.getTeamMemberByTeamIdAndUserId(req, teamId, user.userId)
      ])
         .then(([retrievedTeamRoom, teamMember]) => {
            teamRoom = retrievedTeamRoom;
            if (!teamRoom) {
               throw new TeamRoomNotExistError(teamRoomId);
            }

            return teamRoomMembersTable.createTeamRoomMember(req,
               teamRoomMemberId,
               user.userId,
               teamRoomId,
               teamMemberId,
               teamMember.teamId,
               teamMember.subscriberUserId,
               teamMember.subscriberOrgId,
               role);
         })
         .then(() => {
            teamRoomMemberAdded(req, teamRoom, user, role, teamRoomMemberId);
            return conversationSvc.addUserToConversationByTeamRoomId(req, user, teamRoomId);
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

export const addUserToPrimaryTeamRoom = (req, user, teamId, teamMemberId, role) => {
   return new Promise((resolve, reject) => {
      teamRoomsTable.getTeamRoomByTeamIdAndPrimary(req, teamId, true)
         .then((teamRoom) => {
            if (teamRoom) {
               const { teamRoomId } = teamRoom;
               return addUserToTeamRoom(req, user, teamId, teamMemberId, teamRoomId, role);
            }
            return undefined;
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

export const replyToInvite = (req, teamRoomId, accept, userId) => {
   return new Promise((resolve, reject) => {
      let user;
      let teamRoom;
      let cachedInvitation;
      Promise.all([
         usersTable.getUserByUserId(req, userId),
         teamRoomsTable.getTeamRoomByTeamRoomId(req, teamRoomId),
         teamRoomMembersTable.getTeamRoomMemberByTeamRoomIdAndUserId(req, teamRoomId, userId)
      ])
         .then(([retrievedUser, retrievedTeamRoom, teamRoomMember]) => {
            user = retrievedUser;
            teamRoom = retrievedTeamRoom;
            if (!user) {
               throw new UserNotExistError();
            }

            if (!teamRoom) {
               throw new TeamRoomNotExistError(teamRoomId);
            }

            if (teamRoomMember) {
               throw new TeamRoomMemberExistsError(`teamRoomId=${teamRoomId}, userId=${userId}`);
            }

            return deleteInvitation(req, user.emailAddress, InvitationKeys.teamRoomId, teamRoomId);
         })
         .then((retrievedCachedInvitation) => {
            cachedInvitation = retrievedCachedInvitation;
            if ((cachedInvitation) && (teamRoom.teamActive)) {
               if ((teamRoom.active) && (accept)) {
                  const { teamId } = cachedInvitation;
                  userInvitationAccepted(req, cachedInvitation, userId);
                  return teamMembersTable.getTeamMemberByTeamIdAndUserId(req, teamId, userId);
               } else if (!accept) {
                  userInvitationDeclined(req, cachedInvitation, userId);
               }
               return undefined;
            }
            throw new InvitationNotExistError(teamRoomId);
         })
         .then((teamMember) => {
            if (teamMember) {
               const { teamMemberId } = teamMember;
               return addUserToTeamRoom(req, user, teamMember.teamId, teamMemberId, teamRoomId, Roles.user);
            }
            return undefined;
         })
         .then(() => {
            const state = (accept) ? 'ACCEPTED' : 'DECLINED';
            return invitationsTable.updateInvitationsStateByInviteeEmail(req, user.emailAddress, InvitationKeys.teamRoomId, teamRoomId, state);
         })
         .then((changedInvitations) => {
            resolve();
            sentInvitationStatus(req, changedInvitations);
         })
         .catch((err) => {
            if (err instanceof TeamRoomMemberExistsError) {
               resolve();
            } else {
               reject(err);
            }
         });
   });
};
