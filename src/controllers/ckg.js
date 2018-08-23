import httpStatus from 'http-status';
import * as ckgSvc from '../services/ckgService';

export const getFiles = async (req, res) => {
   const { neo4jSession } = req.app.locals;
   const { subscriberOrgId } = req.params;

   const files = await ckgSvc.getFilesBySubscriberOrgId(neo4jSession, subscriberOrgId)

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
    const searchTerm = req.params.searchTerm;
    const caseInsensitive = req.params.caseInsensitive || 1;
    const andOperator = req.params.andOperator || 0;

    console.log("andOperator="+andOperator);

    const files = await ckgSvc.getFilesBySubscriberOrgIdSearchTerm(neo4jSession, subscriberOrgId, searchTerm, caseInsensitive, andOperator)
 
    return res.status(httpStatus.OK).json({
       message: {
          fileTypes: [],
          files,
          edges: []
       }
    });
 };
