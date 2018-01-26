import _ from 'lodash';
import uuid from 'uuid';
import config from '../config/env';
import * as subscriberOrgsTable from '../repositories/db/subscriberOrgsTable';
import * as teamsTable from '../repositories/db/teamsTable';
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
   UserNotExistError
} from './errors';
import InvitationKeys from '../repositories/InvitationKeys';
import * as invitationsTable from '../repositories/db/invitationsTable';
import * as usersTable from '../repositories/db/usersTable';
import * as teamMembersTable from '../repositories/db/teamMembersTable';
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
import {
   createItem,
   getTeamRoomMembersByTeamMemberIds,
   getTeamRoomMembersByTeamRoomId,
   getTeamRoomMembersByTeamRoomIdAndUserIdAndRole,
   getTeamRoomMembersByUserIds,
   getTeamRoomsByIds,
   getTeamRoomsByTeamId,
   getTeamRoomsByTeamIdAndName,
   getTeamRoomsByTeamIdAndPrimary,
   updateItem
} from '../repositories/util';
import Roles from './roles';

export const defaultTeamRoomName = 'Lobby';

export const getUserTeamRooms = (req, userId, { teamId, subscriberOrgId } = {}) => {
   return new Promise((resolve, reject) => {
      let promise;
      if (teamId) {
         promise = teamMembersTable.getTeamMemberByTeamIdAndUserId(req, teamId, userId);
      } else if (subscriberOrgId) {
         promise = teamMembersTable.getTeamMembersByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId);
      } else {
         promise = teamMembersTable.getTeamMembersByUserId(req, userId);
      }
      promise
         .then((teamMembers) => {
            const teamMemberIds = (teamMembers instanceof Array) ? teamMembers.map(teamMember => teamMember.teamMemberId) : [teamMembers.teamMemberId];
            return getTeamRoomMembersByTeamMemberIds(req, teamMemberIds);
         })
         .then((teamRoomMembers) => {
            const teamRoomIds = teamRoomMembers.map((teamRoomMember) => {
               return teamRoomMember.teamRoomMemberInfo.teamRoomId;
            });
            return getTeamRoomsByIds(req, teamRoomIds);
         })
         .then((teamRooms) => {
            // Remove partitionId.
            const retTeamRooms = [];
            teamRooms.forEach((teamRoom) => {
               const teamRoomClone = _.cloneDeep(teamRoom);
               delete teamRoomClone.partitionId;
               teamRoomClone.teamRoomInfo.active =
                  (('teamActive' in teamRoomClone.teamRoomInfo) && (teamRoomClone.teamRoomInfo.teamActive === false))
                     ? false : teamRoomClone.teamRoomInfo.active;
               retTeamRooms.push(teamRoomClone);
            });
            resolve(retTeamRooms);
         })
         .catch(err => reject(err));
   });
};

export const createTeamRoomNoCheck = (req, subscriberOrgId, teamId, teamRoomInfo, teamMemberId, user, teamRoomAdminUserIds, teamRoomId = undefined) => {
   const actualTeamRoomId = teamRoomId || uuid.v4();
   const icon = teamRoomInfo.icon || null;
   const preferences = teamRoomInfo.preferences || { private: {} };
   if (preferences.private === undefined) {
      preferences.private = {};
   }
   preferences.iconColor = preferences.iconColor || '#557DBF'; // default color for team room
   const teamRoom = {
      teamId,
      teamActive: true,
      name: teamRoomInfo.name,
      purpose: teamRoomInfo.purpose,
      publish: teamRoomInfo.publish,
      icon,
      active: teamRoomInfo.active,
      primary: teamRoomInfo.primary || false,
      preferences,
      created: req.now.format(),
      lastModified: req.now.format()
   };
   const teamRoomMemberId = uuid.v4();

   return new Promise((resolve, reject) => {
      const role = Roles.admin;
      createItem(req, -1, `${config.tablePrefix}teamRooms`, 'teamRoomId', actualTeamRoomId, 'teamRoomInfo', teamRoom)
         .then(() => {
            const teamRoomMember = {
               teamMemberId,
               teamRoomId: actualTeamRoomId,
               userId: user.userId,
               role,
               created: req.now.format(),
               lastModified: req.now.format()
            };
            return createItem(req, -1, `${config.tablePrefix}teamRoomMembers`, 'teamRoomMemberId', teamRoomMemberId, 'teamRoomMemberInfo', teamRoomMember);
         })
         .then(() => {
            teamRoom.teamRoomId = actualTeamRoomId;
            teamRoomCreated(req, teamRoom, teamRoomAdminUserIds);
            teamRoomMemberAdded(req, actualTeamRoomId, user, role, teamRoomMemberId);

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
               return ((!prevValue) && (adminTeamMember.userId === userId)) ? adminTeamMember.teamMemberId : undefined;
            }, undefined);
            return Promise.all([
               getTeamRoomsByTeamIdAndName(req, teamId, teamRoomInfo.name),
               usersTable.getUserByUserId(req, userId)
            ]);
         })
         .then((promiseResults) => {
            const teamRooms = promiseResults[0];
            const user = promiseResults[1];
            if (teamRooms.length > 0) {
               throw new TeamRoomExistsError(teamRoomInfo.name);
            }

            return createTeamRoomNoCheck(req, subscriberOrgId, teamId, teamRoomInfo, teamMemberId, user, teamAdminUserIds, teamRoomId);
         })
         .then(teamRoom => resolve(teamRoom))
         .catch(err => reject(err));
   });
};

export const updateTeamRoom = (req, teamRoomId, updateInfo, userId) => {
   return new Promise((resolve, reject) => {
      const timestampedUpdateInfo = _.cloneDeep(updateInfo);
      timestampedUpdateInfo.lastModified = req.now.format();
      let dbTeamRoom;
      getTeamRoomsByIds(req, [teamRoomId])
         .then((teamRooms) => {
            if (teamRooms.length === 0) {
               throw new TeamRoomNotExistError(teamRoomId);
            }

            dbTeamRoom = teamRooms[0];
            return getTeamRoomMembersByTeamRoomIdAndUserIdAndRole(req, dbTeamRoom.teamRoomId, userId, Roles.admin);
         })
         .then((teamMembers) => {
            if (teamMembers.length === 0) {
               throw new NoPermissionsError(teamRoomId);
            }

            if ((dbTeamRoom.teamRoomInfo.primary) && (updateInfo.active === false)) {
               throw new CannotDeactivateError(teamRoomId);
            }

            return updateItem(req, -1, `${config.tablePrefix}teamRooms`, 'teamRoomId', teamRoomId, { teamRoomInfo: timestampedUpdateInfo });
         })
         .then(() => {
            resolve();

            const teamRoom = dbTeamRoom.teamRoomInfo;
            const previousActive = teamRoom.active;
            _.merge(teamRoom, timestampedUpdateInfo); // Eventual consistency, so might be old.
            teamRoom.teamRoomId = teamRoomId;
            teamRoomUpdated(req, teamRoom);
            if ((updateInfo.preferences) && (updateInfo.preferences.private)) {
               teamRoomPrivateInfoUpdated(req, teamRoom);
            }

            if (('active' in updateInfo) && (previousActive !== updateInfo.active)) {
               // Enable/disable children. Um, no children for this.
               conversationSvc.setConversationOfTeamRoomActive(req, teamRoomId, updateInfo.active);
            }
         })
         .catch((err) => {
            if (err.code === 'ValidationException') {
               reject(new TeamRoomNotExistError(teamRoomId));
            } else {
               reject(err);
            }
         });
   });
};

export const setTeamRoomsOfTeamActive = (req, teamId, active) => {
   return new Promise((resolve, reject) => {
      const teamRooms = [];
      getTeamRoomsByTeamId(req, teamId)
         .then((dbTeamRooms) => {
            const updateTeamRooms = [];
            dbTeamRooms.forEach((dbTeamRoom) => {
               const { teamRoomInfo } = dbTeamRoom;
               teamRoomInfo.teamActive = active;
               updateTeamRooms.push(updateItem(req, -1, `${config.tablePrefix}teamRooms`, 'teamRoomId', dbTeamRoom.teamRoomId, { teamRoomInfo: { teamActive: active } }));
               teamRooms.push(_.merge({ teamRoomId: dbTeamRoom.teamRoomId }, teamRoomInfo));
            });
            return Promise.all(updateTeamRooms);
         })
         .then(() => {
            const updateConversations = [];
            teamRooms.forEach((teamRoom) => {
               updateConversations.push(conversationSvc.setConversationOfTeamRoomActive(req, teamRoom.teamRoomId, active));
            });
            return Promise.all(updateConversations);
         })
         .then(() => {
            resolve();

            teamRooms.forEach((teamRoom) => {
               teamRoomUpdated(req, teamRoom);
            });
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
      getTeamRoomMembersByTeamRoomId(req, teamRoomId)
         .then((teamRoomMembers) => {
            if (teamRoomMembers.length === 0) {
               throw new TeamRoomNotExistError(teamRoomId);
            }

            const userIds = teamRoomMembers.map((teamRoomMember) => {
               userIdsRoles[teamRoomMember.teamRoomMemberInfo.userId] = teamRoomMember.teamRoomMemberInfo.role;
               userIdsTeamRoomMemberIds[teamRoomMember.teamRoomMemberInfo.userId] = teamRoomMember.teamRoomMemberId;
               return teamRoomMember.teamRoomMemberInfo.userId;
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
         getTeamRoomsByIds(req, [teamRoomId]),
         getTeamRoomMembersByTeamRoomIdAndUserIdAndRole(req, teamRoomId, userId, Roles.admin)
      ])
         .then((promiseResults) => {
            const teamRooms = promiseResults[0];
            const teamRoomMembers = promiseResults[1];

            if (teamRooms.length === 0) {
               throw new TeamRoomNotExistError(teamRoomId);
            }
            teamRoom = teamRooms[0];

            if (teamRoomMembers.length === 0) {
               throw new NoPermissionsError(teamRoomId);
            }

            if ((('teamActive' in teamRoom.teamRoomInfo) && (teamRoom.teamRoomInfo.teamActive === false)) || (teamRoom.teamRoomInfo.active === false)) {
               throw new CannotInviteError(teamRoomId);
            }

            return teamsTable.getTeamByTeamId(req, teamRoom.teamRoomInfo.teamId);
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
            return getTeamRoomMembersByUserIds(req, inviteDbUserIds);
         })
         .then((teamRoomMembers) => {
            const teamRoomMembersOfTeamRoom = teamRoomMembers.filter(teamRoomMember => teamRoomMember.teamRoomMemberInfo.teamRoomId === teamRoomId);
            if (teamRoomMembersOfTeamRoom.length !== 0) {
               const doNotInviteUserIds = teamRoomMembersOfTeamRoom.map(teamRoomMember => teamRoomMember.teamRoomMemberInfo.userId);
               inviteDbUsers = inviteDbUsers.filter(inviteDbUser => doNotInviteUserIds.indexOf(inviteDbUser.userId) < 0);
            }
            return inviteExistingUsersToTeamRoom(req, dbUser, inviteDbUsers, subscriberOrg, team, teamRoom);
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

export const addUserToTeamRoom = (req, user, teamMemberId, teamRoomId, role) => {
   return new Promise((resolve, reject) => {
      const teamRoomMemberId = uuid.v4();
      getTeamRoomsByIds(req, [teamRoomId])
         .then((teamRooms) => {
            if (teamRooms.length === 0) {
               throw new TeamRoomNotExistError(teamRoomId);
            }

            const teamRoomMember = {
               teamMemberId,
               teamRoomId,
               userId: user.userId,
               role,
               created: req.now.format(),
               lastModified: req.now.format()
            };
            return createItem(req, -1, `${config.tablePrefix}teamRoomMembers`, 'teamRoomMemberId', teamRoomMemberId, 'teamRoomMemberInfo', teamRoomMember);
         })
         .then(() => {
            teamRoomMemberAdded(req, teamRoomId, user, role, teamRoomMemberId);
            return conversationSvc.addUserToConversationByTeamRoomId(req, user, teamRoomId);
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

export const addUserToPrimaryTeamRoom = (req, user, teamId, teamMemberId, role) => {
   return new Promise((resolve, reject) => {
      getTeamRoomsByTeamIdAndPrimary(req, teamId, true)
         .then((teamRooms) => {
            if (teamRooms.length > 0) {
               const teamRoomId = teamRooms[0].teamRoomId;
               return addUserToTeamRoom(req, user, teamMemberId, teamRoomId, role);
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
      Promise.all([usersTable.getUserByUserId(req, userId), getTeamRoomsByIds(req, [teamRoomId])])
         .then((promiseResults) => {
            user = promiseResults[0];
            const teamRooms = promiseResults[1];

            if (!user) {
               throw new UserNotExistError();
            }

            if (teamRooms.length === 0) {
               throw new TeamRoomNotExistError(teamRoomId);
            }
            teamRoom = teamRooms[0];

            return deleteInvitation(req, user.emailAddress, InvitationKeys.teamRoomId, teamRoomId);
         })
         .then((retrievedCachedInvitation) => {
            cachedInvitation = retrievedCachedInvitation;
            if ((cachedInvitation) && ((!('teamActive' in teamRoom.teamRoomInfo)) || (teamRoom.teamRoomInfo.teamActive))) {
               if ((teamRoom.teamRoomInfo.active) && (accept)) {
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
               return addUserToTeamRoom(req, user, teamMemberId, teamRoomId, Roles.user);
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
         .catch(err => reject(err));
   });
};
