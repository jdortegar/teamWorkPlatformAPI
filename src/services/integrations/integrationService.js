// TODO: Migrate the integrations refactored here.
import _ from 'lodash';
import * as teamMemberTable from '../../repositories/db/teamMembersTable';

export const getTeamIntegrations = async (req, teamId) => {
    const subscribers = await teamMemberTable.getTeamMembersByTeamId(req, teamId);
    const teamMembersIntegrations = [];
    subscribers.forEach((teamMember) => {
        if (teamMember.integrations) {  
            const memberIntegrations = _.cloneDeep(teamMember.integrations);
            teamMembersIntegrations.push({
                integrations: memberIntegrations,
                teamId: teamMember.teamId,
                userId: teamMember.userId
            });
        }
    });
    return teamMembersIntegrations;
}