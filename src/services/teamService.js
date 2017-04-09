import uuid from 'uuid';
import config from '../config/env';
import { getSubscriberUsers, getTeamMembersBySubscriberUserIds, getTeamsByIds } from './util';

class TeamService {
   getUserTeams(req, userId) {
      return new Promise((resolve, reject) => {
         getSubscriberUsers(req, userId)
            .then((subscriberUsers) => {
               const subscriberUserIds = subscriberUsers.map((subscriberUser) => subscriberUser.subscriberUserId);
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
               for (let team of teams) {
                  team = JSON.parse(JSON.stringify(team));
                  delete team.partitionId;
                  retTeams.push(team);
               }
               resolve(retTeams);
            })
            .catch((err) => reject(err));
      });
   }
}

const teamService = new TeamService();
export default teamService;
