// TODO: Migrate the integrations refactored here.
import _ from 'lodash';
import * as subscriberTeamTable from '../../repositories/db/subscriberTeamsTable';

export const getTeamIntegrations = async (req, teamId) => {
    const subscribers = subscriberTeamTable.getSubscriberTeamsByTeamId(req, teamId);
    const integrations = [];
    subscribers.forEach((subscriberTeam) => {
        if (subscriberTeam.integrations) {
            const memberIntegrations = _.cloneDeep(subscriberTeam.integrations);
            _.merge(memberIntegrations, { teamId: subscriberTeam.teamId, userId: subscriberTeam.userId });
            integrations.push(memberIntegrations);
        }
    });
    return integrations;
}