// TODO: Migrate the integrations refactored here.
import _ from 'lodash';
import * as teamMemberTable from '../../repositories/db/teamMembersTable';

export const getTeamIntegrations = async (req, teamId) => {
    const subscribers = teamMemberTable.getTeamMembersByTeamId(req, teamId);
    const integrations = [];
    subscribers.forEach((teamMember) => {
        if (teamMember.integrations) {
            const memberIntegrations = _.cloneDeep(teamMember.integrations);
            _.merge(memberIntegrations, { teamId: teamMember.teamId, userId: teamMember.userId });
            integrations.push(memberIntegrations);
        }
    });
    return integrations;
}