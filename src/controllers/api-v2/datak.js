import httpStatus from 'http-status';
import * as datakSvc from '../../services/datakService';
import * as ckgSvc from '../../services/ckgService';
import * as ckgTeamSvc from '../../services/ckgTeamService';
import { getTeamMembersByUserId } from '../../repositories/db/teamMembersTable';
import { isNull } from 'util';

export const getDataBySearchTerm = async (req, res) => {
    const { neo4jSession } = req.app.locals;
    const hablaUserId = req.params.hablaUserId;
    const searchTerm = req.params.searchTerm;
    const caseInsensitive = req.params.caseInsensitive || 1;
    const andOperator = req.params.andOperator || 0;

    console.log("hablaUserId=" + hablaUserId);
    console.log("searchTerm=" + searchTerm);

    var data = null;

    if (hablaUserId !== null && searchTerm !== null) {
        data = await datakSvc.getDataBySearchTerm(neo4jSession, hablaUserId, searchTerm, caseInsensitive, andOperator);
    } else {
        if (hablaUserId == null) {
            console.error("hablaUserId is null ");
        } else {
            console.error("searchTeam is null");
        }
    }

    return res.status(httpStatus.OK).json({
        message: {
            data,
        }
    });
};

export const getDataFilesBySearchTerm = async (req, res) => {
    try {

        const { neo4jSession } = req.app.locals;
        const hablaUserId = req.params.hablaUserId;
        const searchTerm = req.params.searchTerm;
        const caseInsensitive = req.params.caseInsensitive || 1;
        const andOperator = req.params.andOperator || 0;

        console.log("andOperator=" + andOperator);

        var data = null;
        var files = [];
        var teams = null;
        if (hablaUserId !== null && searchTerm !== null) {

            // getting messages and attached files 
            // and teams one user belongs to 
            [data, teams] = await Promise.all([ 
                datakSvc.getDataBySearchTerm( neo4jSession, hablaUserId, searchTerm, caseInsensitive, andOperator ),
                getTeamMembersByUserId( req, hablaUserId ) 
            ]);

            // getting integration files 
            // get team files 
            const promises = []; 
            teams.forEach((item) => { 
                promises.push(ckgTeamSvc.getFilesBySubscriberTeamIdSearchTerm(neo4jSession, item.teamId, searchTerm, caseInsensitive, andOperator)); 
            }); 
            const teamFiles = await Promise.all(promises); 
            teamFiles.forEach((val) => { 
                if (val.length !== 0 && val !== null) { 
                    if (val.length >= files.length) { 
                        files = val.concat(files); 
                    } else { 
                        files = files.concat(val); 
                    } 
                }
            });

            // get org files
            var orgFiles = null;
            orgFiles = await ckgSvc.getFilesBySubscriberOrgIdSearchTerm(neo4jSession, teams[0].subscriberOrgId, searchTerm, caseInsensitive, andOperator)
            if (orgFiles !== null & orgFiles.length !== 0) {
                files = files.concat(orgFiles)
            }

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
                data,
                files,
                edges: []
            }
        });
    } catch (err) {
        console.error('*****ERROR', err);
        return Promise.reject(err);
    }
};