import _ from 'lodash';
import uuid from 'uuid';
import config from '../config/env';
import { NoPermissionsError, TeamExistsError, TeamNotExistError, UserNotExistError } from './errors';
import { inviteExistingUsersToTeam } from './invitations';
import { teamCreated, teamPrivateInfoUpdated, teamUpdated } from './messaging';
import Roles from './roles';
import teamRoomSvc from './teamRoomService';
import {
   createItem,
   getSubscriberOrgsByIds,
   getSubscriberUsersByUserIdAndSubscriberOrgIdAndRole,
   getSubscriberUsersByUserIds,
   getTeamMembersBySubscriberUserIds,
   getTeamMembersByTeamIdAndUserIdAndRole,
   getTeamMembersByTeamId,
   getTeamsByIds,
   getTeamBySubscriberOrgIdAndName,
   getUsersByIds,
   updateItem
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
                  userId,
                  role: Roles.admin
               };
               return createItem(req, -1, `${config.tablePrefix}teamMembers`, 'teamMemberId', teamMemberId, 'teamMemberInfo', teamMember);
            })
            .then(() => {
               team.teamId = actualTeamId;
               teamCreated(req, team, userId);

               const teamRoom = {
                  name: `${team.name} Lobby`,
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

         getSubscriberUsersByUserIdAndSubscriberOrgIdAndRole(req, userId, subscriberOrgId, Roles.admin)
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

   updateTeam(req, teamId, updateInfo, userId) {
      return new Promise((resolve, reject) => {
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

               updateItem(req, -1, `${config.tablePrefix}teams`, 'teamId', teamId, { teamInfo: updateInfo });
            })
            .then(() => {
               resolve();

               const team = dbTeam.teamInfo;
               _.merge(team, updateInfo); // Eventual consistency, so might be old.
               team.teamId = teamId;
               teamUpdated(req, team);
               if ((updateInfo.preferences) && (updateInfo.preferences.private)) {
                  teamPrivateInfoUpdated(req, team);
               }
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
      const userIdsRoles = {};

      return new Promise((resolve, reject) => {
         getTeamMembersByTeamId(req, teamId)
            .then((teamMembers) => {
               if (teamMembers.length === 0) {
                  throw new TeamNotExistError(teamId);
               }

               const userIds = teamMembers.map((teamMember) => {
                  userIdsRoles[teamMember.teamMemberInfo.userId] = teamMember.teamMemberInfo.role;
                  return teamMember.teamMemberInfo.userId;
               });
               if ((userId) && (userIds.indexOf(userId)) < 0) {
                  throw new NoPermissionsError(teamId);
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

   inviteMembers(req, teamId, userIds, userId) {
      return new Promise((resolve, reject) => {
         let team;
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

               const uniqueUserIds = userIds.reduce((prevList, userIdEntry) => {
                  if (prevList.indexOf(userIdEntry) < 0) {
                     prevList.push(userIdEntry);
                  }
                  return prevList;
               }, []);

               return Promise.all([
                  getUsersByIds(req, [userId, ...uniqueUserIds]),
                  getSubscriberOrgsByIds(req, [teams[0].teamInfo.subscriberOrgId])
               ]);
            })
            .then((promiseResults) => {
               const dbUser = promiseResults[0][0];
               const existingDbUsers = promiseResults[0];
               existingDbUsers.splice(0, 1);
               const subscriberOrg = promiseResults[1][0];

               // If any of the userIds are bad, fail.
               if (existingDbUsers.length !== userIds.length) {
                  throw new UserNotExistError();
               }

               return inviteExistingUsersToTeam(req, dbUser, existingDbUsers, subscriberOrg, team);
            })
            .then(() => resolve())
            .catch(err => reject(err));
      });
   }
}

const teamService = new TeamService();
export default teamService;
