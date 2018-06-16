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
