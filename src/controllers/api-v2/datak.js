import httpStatus from 'http-status';
import * as datakSvc from '../../services/datakService';
import * as ckgSvc from '../../services/ckgService';
import * as ckgTeamSvc from '../../services/ckgTeamService';
import { getTeamMembersByUserId } from '../../repositories/db/teamMembersTable';

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

        var files = null;
        var teams = null;
        if (hablaUserId !== null && searchTerm !== null) {

            teams = await getTeamMembersByUserId(req, hablaUserId);
            var teamFiles = null;
            var orgFiles = null;
            teams.forEach(async function (item) {
                teamFiles = await ckgTeamSvc.getFilesBySubscriberTeamIdSearchTerm(neo4jSession, item.teamId, searchTerm, caseInsensitive, andOperator)
                if (teamFiles !== null && teamFiles.length !== 0) {
                    files = teamFiles.concat(files)
                }
            });
            orgFiles = await ckgSvc.getFilesBySubscriberOrgIdSearchTerm(neo4jSession, teams[0].subscriberOrgId, searchTerm, caseInsensitive, andOperator)
            if (orgFiles !== null & orgFiles.length !== 0) {
                files = orgFiles.concat(files)
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
                files,
                edges: []
            }
        });
    } catch (err) {
        console.error('*****ERROR', err);
        return Promise.reject(err);
    }
};