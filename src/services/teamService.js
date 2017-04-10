import {
   getSubscriberUsersByIds,
   getSubscriberUsersByUserIds,
   getTeamMembersBySubscriberUserIds,
   getTeamMembersByTeamId,
   getTeamsByIds,
   getUsersByIds
} from './util';

export class TeamNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, TeamNotExistError);
   }
}

export class NoPermissionsError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, NoPermissionsError);
   }
}

class TeamService {

   getUserTeams(req, userId) {
      return new Promise((resolve, reject) => {
         getSubscriberUsersByUserIds(req, [userId])
            .then((subscriberUsers) => {
               const subscriberUserIds = subscriberUsers.map(subscriberUser => subscriberUser.subscriberUserId);
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
