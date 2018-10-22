import httpStatus from 'http-status';
import * as ckgSvc from '../services/ckgService';
import * as ckgTeamSvc from '../services/ckgTeamService';

export const getFiles = async (req, res) => {
   const { neo4jSession } = req.app.locals;
   const { subscriberOrgId } = req.params.subscriberOrgId;
   const { subscriberTeamId } = req.params.subscriberTeamId;
   var files = null;

   if (subscriberTeamId !== null && subscriberTeamId !== '' && subscriberTeamId !== 0) {
       files = await ckgTeamSvc.getFilesBySubscriberTeamId(neo4jSession, subscriberTeamId)
   } else {
    files = await ckgSvc.getFilesBySubscriberOrgId(neo4jSession, subscriberOrgId)
   }

   return res.status(httpStatus.OK).json({
      message: {
         fileTypes: [],
         files,
         edges: []
      }
   });
};

export const getFilesBySearchTerm = async (req, res) => {
    const { neo4jSession } = req.app.locals;
    const subscriberOrgId = req.params.subscriberOrgId;
    const subscriberTeamId = req.params.subscriberTeamId;
    const searchTerm = req.params.searchTerm;
    const caseInsensitive = req.params.caseInsensitive || 1;
    const andOperator = req.params.andOperator || 0;

    console.log("andOperator="+andOperator);

    var files = null;

    if (subscriberTeamId !== null && subscriberTeamId !== '' && subscriberTeamId !== 0) {
        files = await ckgTeamSvc.getFilesBySubscriberOrgIdSearchTerm(neo4jSession, subscriberTeamId, searchTerm, caseInsensitive, andOperator)
    } else {
        files = await ckgSvc.getFilesBySubscriberOrgIdSearchTerm(neo4jSession, subscriberOrgId, searchTerm, caseInsensitive, andOperator)
    }

    return res.status(httpStatus.OK).json({
       message: {
          fileTypes: [],
          files,
          edges: []
       }
    });
 };
