import _ from 'lodash';
import uuid from 'uuid';
import config from '../config/env';
import conversationSvc from './conversationService';
import { NoPermissionsError, TeamRoomExistsError, TeamRoomNotExistError } from './errors';
import { teamRoomCreated, teamRoomPrivateInfoUpdated, teamRoomUpdated } from './messaging';
import {
   createItem,
   getSubscriberUsersByIds,
   getSubscriberUsersByUserIds,
   getTeamMembersByIds,
   getTeamMembersBySubscriberUserIds,
   getTeamMembersByTeamIdAndUserIdAndRole,
   getTeamRoomMembersByTeamMemberIds,
   getTeamRoomMembersByTeamRoomId,
   getTeamRoomsByIds,
   getTeamRoomsByTeamIdAndName,
   getUsersByIds,
   updateItem
} from './queries';
import Roles from './roles';


class TeamRoomService {
   getUserTeamRooms(req, userId, { teamId, subscriberOrgId } = {}) {
      const filterSubscriberOrgId = (teamId) ? undefined : subscriberOrgId;
      return new Promise((resolve, reject) => {
         getSubscriberUsersByUserIds(req, [userId])
            .then((subscriberUsers) => {
               const filteredSubscriberUsers = (filterSubscriberOrgId) ? subscriberUsers.filter(subscriberUser => subscriberUser.subscriberUserInfo.subscriberOrgId === filterSubscriberOrgId) : subscriberUsers;
               const subscriberUserIds = filteredSubscriberUsers.map(subscriberUser => subscriberUser.subscriberUserId);
               return getTeamMembersBySubscriberUserIds(req, subscriberUserIds);
            })
            .then((teamMembers) => {
               const filteredTeamMembers = (teamId) ? teamMembers.filter(teamMember => teamMember.teamMemberInfo.teamId === teamId) : teamMembers;
               const teamMemberIds = filteredTeamMembers.map((teamMember) => {
                  return teamMember.teamMemberId;
               });
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
                  const teamRoomClone = JSON.parse(JSON.stringify(teamRoom));
                  delete teamRoomClone.partitionId;
                  retTeamRooms.push(teamRoomClone);
               });
               resolve(retTeamRooms);
            })
            .catch(err => reject(err));
      });
   }

   createTeamRoomNoCheck(req, teamId, teamRoomInfo, teamMemberId, userId, teamRoomId = undefined) {
      const actualTeamRoomId = teamRoomId || uuid.v4();
      const preferences = teamRoomInfo.preferences || { private: {} };
      if (preferences.private === undefined) {
         preferences.private = {};
      }
      const teamRoom = {
         teamId,
         name: teamRoomInfo.name,
         purpose: teamRoomInfo.purpose,
         publish: teamRoomInfo.publish,
         active: teamRoomInfo.active,
         preferences
      };
      const teamRoomMemberId = uuid.v4();

      return new Promise((resolve, reject) => {
         createItem(req, -1, `${config.tablePrefix}teamRooms`, 'teamRoomId', actualTeamRoomId, 'teamRoomInfo', teamRoom)
            .then(() => {
               const teamRoomMember = {
                  teamMemberId,
                  teamRoomId: actualTeamRoomId,
                  userId,
                  role: Roles.admin
               };
               return createItem(req, -1, `${config.tablePrefix}teamRoomMembers`, 'teamRoomMemberId', teamRoomMemberId, 'teamRoomMemberInfo', teamRoomMember);
            })
            .then(() => {
               teamRoom.teamRoomId = actualTeamRoomId;
               teamRoomCreated(req, teamRoom, userId);

               const conversation = {};
               return conversationSvc.createConversationNoCheck(req, actualTeamRoomId, conversation, userId);
            })
            .then(() => resolve(teamRoom))
            .catch(err => reject(err));
      });
   }

   createTeamRoom(req, teamId, teamRoomInfo, userId, teamRoomId = undefined) {
      return new Promise((resolve, reject) => {
         let teamMemberId;

         // TODO: if (userId), check canCreateTeamRoom() -> false, throw NoPermissionsError
         getTeamMembersByTeamIdAndUserIdAndRole(req, teamId, userId, Roles.admin)
            .then((teamMembers) => {
               if (teamMembers.length === 0) {
                  throw new NoPermissionsError(teamId);
               }

               teamMemberId = teamMembers[0].teamMemberId;
               return getTeamRoomsByTeamIdAndName(req, teamId, teamRoomInfo.name);
            })
            .then((teamRooms) => {
               if (teamRooms.length > 0) {
                  throw new TeamRoomExistsError(teamRoomInfo.name);
               }

               return this.createTeamRoomNoCheck(req, teamId, teamRoomInfo, teamMemberId, userId, teamRoomId);
            })
            .then(teamRoom => resolve(teamRoom))
            .catch(err => reject(err));
      });
   }

   updateTeamRoom(req, teamRoomId, updateInfo, userId) {
      return new Promise((resolve, reject) => {
         let dbTeamRoom;
         getTeamRoomsByIds(req, [teamRoomId])
            .then((teamRooms) => {
               if (teamRooms.length === 0) {
                  throw new TeamRoomNotExistError(teamRoomId);
               }

               dbTeamRoom = teamRooms[0];
               return getTeamMembersByTeamIdAndUserIdAndRole(req, dbTeamRoom.teamRoomId, userId, Roles.admin);
            })
            .then((teamMembers) => {
               if (teamMembers.length === 0) {
                  throw new NoPermissionsError(teamRoomId);
               }

               updateItem(req, -1, `${config.tablePrefix}teamRooms`, 'teamRoomId', teamRoomId, { teamRoomInfo: updateInfo });
            })
            .then(() => {
               resolve();

               const teamRoom = dbTeamRoom.teamRoomInfo;
               _.merge(teamRoom, updateInfo); // Eventual consistency, so might be old.
               teamRoom.teamRoomId = teamRoomId;
               teamRoomUpdated(req, teamRoom);
               if ((updateInfo.preferences) && (updateInfo.preferences.private)) {
                  teamRoomPrivateInfoUpdated(req, teamRoom);
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
   }

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
   getTeamRoomUsers(req, teamRoomId, userId = undefined) {
      const userIdsRoles = {};

      return new Promise((resolve, reject) => {
         getTeamRoomMembersByTeamRoomId(req, teamRoomId)
            .then((teamRoomMembers) => {
               if (teamRoomMembers.length === 0) {
                  throw new TeamRoomNotExistError(teamRoomId);
               }

               const userIds = teamRoomMembers.map((teamRoomMember) => {
                  userIdsRoles[teamRoomMember.teamRoomMemberInfo.userId] = teamRoomMember.teamRoomMemberInfo.role;
                  return teamRoomMember.teamRoomMemberInfo.userId;
               });
               if ((userId) && (userIds.indexOf(userId)) < 0) {
                  throw new NoPermissionsError(teamRoomId);
               }

               return getUsersByIds(req, userIds);
            })
            .then((users) => {
               const usersWithRoles = users.map((user) => {
                  const ret = _.cloneDeep(user);
                  ret.userInfo.role = userIdsRoles[user.userId];
                  return ret;
               });
               resolve(usersWithRoles);
            })
            .catch(err => reject(err));
      });
   }
}

const teamRoomService = new TeamRoomService();
export default teamRoomService;
