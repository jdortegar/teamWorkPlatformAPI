import httpStatus from 'http-status';
import * as ckgSvc from '../services/ckgService';
import * as ckgTeamSvc from '../services/ckgTeamService';
import getTeamMembersByUserId from '../repositories/db/teamMembersTable'
export const getFiles = async (req, res, next) => {
   try {
      const { neo4jSession } = req.app.locals;
      const subscriberOrgId = req.params.subscriberOrgId;
      const subscriberTeamId = req.params.subscriberTeamId;
      var files = null;

      if (subscriberTeamId !== null && subscriberTeamId != 0) {
         console.log("subscriberOrgId=" + subscriberOrgId);
         console.log("subscriberTeamId=" + subscriberTeamId);
         console.log("Team Level");
         files = await ckgTeamSvc.getFilesBySubscriberTeamId(neo4jSession, subscriberTeamId)
      } else {
         console.log("subscriberOrgId=" + subscriberOrgId);
         console.log("subscriberTeamId=" + subscriberTeamId);
         console.log("Organization Level");
         files = await ckgSvc.getFilesBySubscriberOrgId(neo4jSession, subscriberOrgId)
      }

      return res.status(httpStatus.OK).json({
         message: {
            fileTypes: [],
            files,
            edges: []
         }
      });
   } catch (err) {
      console.error('****ERROR', err);
      next(err);
   }
};

export const getFilesBySearchTerm = async (req, res) => {
   try {

      const { neo4jSession } = req.app.locals;
      const subscriberOrgId = req.params.subscriberOrgId;
      const subscriberTeamId = req.params.subscriberTeamId;
      const searchTerm = req.params.searchTerm;
      const caseInsensitive = req.params.caseInsensitive || 1;
      const andOperator = req.params.andOperator || 0;

      console.log("andOperator=" + andOperator);

      var files = null;

      if (subscriberTeamId !== null && subscriberTeamId != 0) {
         console.log("subscriberOrgId=" + subscriberOrgId);
         console.log("subscriberTeamId=" + subscriberTeamId);
         console.log("Team Level");
         files = await ckgTeamSvc.getFilesBySubscriberTeamIdSearchTerm(neo4jSession, subscriberTeamId, searchTerm, caseInsensitive, andOperator)
      } else {
         console.log("subscriberOrgId=" + subscriberOrgId);
         console.log("subscriberTeamId=" + subscriberTeamId);
         console.log("Organization Level");
         files = await ckgSvc.getFilesBySubscriberOrgIdSearchTerm(neo4jSession, subscriberOrgId, searchTerm, caseInsensitive, andOperator)
      }

      return res.status(httpStatus.OK).json({
         message: {
            fileTypes: [],
            files,
            edges: []
         }
      });
   } catch (err) {
      console.error('*****ERROR', err);
      return Promise.reject(err);
   }
};

export const getDataFilesBySearchTerm = async (req, res) => {
   try {

      const { neo4jSession } = req.app.locals;
      const hablaUserId = req.params.hablaUserId;
      const searchTerm = req.params.searchTerm;
      const caseInsensitive = req.params.caseInsensitive || 1;
      const andOperator = req.params.andOperator || 0;

      console.log("andOperator=" + andOperator);
      
      var files = null;
      if (hablaUserId !== null && searchTerm !== null) {         
         teams = await getTeamMembersByUserId(req, hablaUserId);
         teams.forEach(function (item) {
            teamFiles = await ckgTeamSvc.getFilesBySubscriberTeamIdSearchTerm(neo4jSession, item.subscriberTeamId, searchTerm, caseInsensitive, andOperator)
            files = files.concat(teamFiles)
         })
         
         orgFiles = await ckgSvc.getFilesBySubscriberOrgIdSearchTerm(neo4jSession, teams[0].subscriberOrgId, searchTerm, caseInsensitive, andOperator)
         files = files.concat(orgFiles)
      } else {
         if (hablaUserId == null) {
            console.error("hablaUserId is null ");
         } else {
            console.error("searchTeam is null");
         }
      }

      return res.status(httpStatus.OK).json({
         message: {
            fileTypes: [],
            files,
            edges: []
         }
      });
   } catch (err) {
      console.error('*****ERROR', err);
      return Promise.reject(err);
   }
};