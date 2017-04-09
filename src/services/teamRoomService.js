import { getSubscriberUsersByUserIds, getTeamMembersBySubscriberUserIds, getTeamRoomMembersByTeamMemberIds, getTeamRoomsByIds } from './util';

class TeamRoomService {
   getUserTeamRooms(req, userId) {
      return new Promise((resolve, reject) => {
         getSubscriberUsersByUserIds(req, [userId])
            .then((subscriberUsers) => {
               const subscriberUserIds = subscriberUsers.map((subscriberUser) => subscriberUser.subscriberUserId);
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
               for (let teamRoom of teamRooms) {
                  teamRoom = JSON.parse(JSON.stringify(teamRoom));
                  delete teamRoom.partitionId;
                  retTeamRooms.push(teamRoom);
               }
               resolve(retTeamRooms);
            })
            .catch((err) => reject(err));
      });
   }
}

const teamRoomService = new TeamRoomService();
export default teamRoomService;
