import {
   getSubscriberUsersByIds,
   getSubscriberUsersByUserIds,
   getTeamMembersByIds,
   getTeamMembersBySubscriberUserIds,
   getTeamRoomMembersByTeamMemberIds,
   getTeamRoomMembersByTeamRoomId,
   getTeamRoomsByIds,
   getUsersByIds
} from './util';
import { NoPermissionsError } from './teamService';

export class TeamRoomNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, TeamRoomNotExistError);
   }
}


class TeamRoomService {
   getUserTeamRooms(req, userId) {
      return new Promise((resolve, reject) => {
         getSubscriberUsersByUserIds(req, [userId])
            .then((subscriberUsers) => {
               const subscriberUserIds = subscriberUsers.map(subscriberUser => subscriberUser.subscriberUserId);
               return getTeamMembersBySubscriberUserIds(req, subscriberUserIds);
            })
            .then((teamMembers) => {
               const teamMemberIds = teamMembers.map((teamMember) => {
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
      return new Promise((resolve, reject) => {
         getTeamRoomsByIds(req, [teamRoomId])
            .then((teamRooms) => {
               if (teamRooms.length === 0) {
                  throw new TeamRoomNotExistError(teamRoomId);
               }
               return getTeamRoomMembersByTeamRoomId(req, teamRoomId);
            })
            .then((teamRoomMembers) => {
               if (teamRoomMembers.length === 0) {
                  throw new NoPermissionsError(teamRoomId);
               }

               const teamMemberIds = teamRoomMembers.map(teamRoomMember => teamRoomMember.teamRoomMemberInfo.teamMemberId);
               return getTeamMembersByIds(req, teamMemberIds);
            })
            .then((teamMembers) => {
               const subscriberUserIds = teamMembers.map((teamMember) => {
                  return teamMember.teamMemberInfo.subscriberUserId;
               });
               return getSubscriberUsersByIds(req, subscriberUserIds);
            })
            .then((subscriberUsers) => {
               const userIds = subscriberUsers.map(subscriberUser => subscriberUser.subscriberUserInfo.userId);
               if ((userId) && (userIds.indexOf(userId)) < 0) {
                  throw new NoPermissionsError(teamRoomId);
               }

               return getUsersByIds(req, userIds);
            })
            .then(users => resolve(users))
            .catch(err => reject(err));
      });
   }
}

const teamRoomService = new TeamRoomService();
export default teamRoomService;
