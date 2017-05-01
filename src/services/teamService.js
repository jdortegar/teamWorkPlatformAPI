import uuid from 'uuid';
import config from '../config/env';
import { NoPermissionsError, TeamExistsError, TeamNotExistError } from './errors';
import { teamCreated } from './messaging';
import teamRoomSvc from './teamRoomService';
import {
   createItem,
   getSubscriberUsersByIds,
   getSubscriberUserByUserIdAndSubscriberOrgId,
   getSubscriberUsersByUserIds,
   getTeamMembersBySubscriberUserIds,
   getTeamMembersByTeamId,
   getTeamsByIds,
   getTeamBySubscriberOrgIdAndName,
   getUsersByIds
} from './queries';


class TeamService {

   getUserTeams(req, userId, subscriberOrgId = undefined) {
      return new Promise((resolve, reject) => {
         getSubscriberUsersByUserIds(req, [userId])
            .then((subscriberUsers) => {
               const filteredSubscriberUsers = (subscriberOrgId) ? subscriberUsers.filter(subscriberUser => subscriberUser.subscriberUserInfo.subscriberOrgId === subscriberOrgId) : subscriberUsers;
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
                  const teamClone = JSON.parse(JSON.stringify(team));
                  delete teamClone.partitionId;
                  retTeams.push(teamClone);
               });
               resolve(retTeams);
            })
            .catch(err => reject(err));
      });
   }

   createTeamNoCheck(req, subscriberOrgId, teamInfo, subscriberUserId, userId, teamId = undefined) {
      const actualTeamId = teamId || uuid.v4();
      const preferences = teamInfo.preferences || { private: {} };
      if (preferences.private === undefined) {
         preferences.private = {};
      }
      const team = {
         subscriberOrgId,
         name: teamInfo.name,
         preferences
      };
      const teamMemberId = uuid.v4();

      return new Promise((resolve, reject) => {
         createItem(req, -1, `${config.tablePrefix}teams`, 'teamId', actualTeamId, 'teamInfo', team)
            .then(() => {
               const teamMember = {
                  subscriberUserId,
                  teamId: actualTeamId,
                  userId
               };
               return createItem(req, -1, `${config.tablePrefix}teamMembers`, 'teamMemberId', teamMemberId, 'teamMemberInfo', teamMember);
            })
            .then(() => {
               team.teamId = actualTeamId;
               teamCreated(req, team, userId);

               const teamRoom = {
                  name: 'Lobby',
                  purpose: undefined,
                  publish: true,
                  active: true
               };
               return teamRoomSvc.createTeamRoomNoCheck(req, actualTeamId, teamRoom, teamMemberId, userId);
            })
            .then(() => resolve(team))
            .catch(err => reject(err));
      });
   }

   createTeam(req, subscriberOrgId, teamInfo, userId, teamId = undefined) {
      return new Promise((resolve, reject) => {
         let subscriberUserId;

         // TODO: if (userId), check canCreateTeam() -> false, throw NoPermissionsError
         getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId)
            .then((subscriberUsers) => {
               if (subscriberUsers.length === 0) {
                  throw new NoPermissionsError(subscriberOrgId);
               }

               subscriberUserId = subscriberUsers[0].subscriberUserId;
               return getTeamBySubscriberOrgIdAndName(req, subscriberOrgId, teamInfo.name);
            })
            .then((existingTeam) => {
               if (existingTeam.length > 0) {
                  throw new TeamExistsError(teamInfo.name);
               }

               return this.createTeamNoCheck(req, subscriberOrgId, teamInfo, subscriberUserId, userId, teamId);
            })
            .then(team => resolve(team))
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
   getTeamUsers(req, teamId, userId = undefined) {
      return new Promise((resolve, reject) => {
         getTeamsByIds(req, [teamId])
            .then((teams) => {
               if (teams.length === 0) {
                  throw new TeamNotExistError(teamId);
               }
               return getTeamMembersByTeamId(req, teamId);
            })
            .then((teamMembers) => {
               if (teamMembers.length === 0) {
                  throw new NoPermissionsError(teamId);
               }

               const subscriberUserIds = teamMembers.map((teamMember) => {
                  return teamMember.teamMemberInfo.subscriberUserId;
               });
               return getSubscriberUsersByIds(req, subscriberUserIds);
            })
            .then((subscriberUsers) => {
               const userIds = subscriberUsers.map(subscriberUser => subscriberUser.subscriberUserInfo.userId);
               if ((userId) && (userIds.indexOf(userId)) < 0) {
                  throw new NoPermissionsError(teamId);
               }

               return getUsersByIds(req, userIds);
            })
            .then(users => resolve(users))
            .catch(err => reject(err));
      });
   }
}

const teamService = new TeamService();
export default teamService;
