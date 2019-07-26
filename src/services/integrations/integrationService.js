// TODO: Migrate the integrations refactored here.
import _ from 'lodash';
import * as teamMemberTable from '../../repositories/db/teamMembersTable';
import * as boxSvc from '../boxService';
import * as dropboxSvc from '../dropboxService';
import * as googleSvc from '../googleService';
import * as onedriveSvc from '../onedriveService';
import * as salesforceSvc from '../salesforceService';
import { IntegrationNotExistError } from '../errors';

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
};

export const refreshIntegration = async (req, userId, subscriberId, integration) => {
    try {
        let redirectUri;
        switch (integration) {
            case 'box': 
                await boxSvc.revokeBox(req, userId, subscriberId, false);
                redirectUri = await boxSvc.integrateBox(req, userId, subscriberId);
                break;
            case 'dropbox':
                await dropboxSvc.revokeDropbox(req, userId, subscriberId, false);
                redirectUri = await dropboxSvc.integrateDropbox(req, userId, subscriberId); 
                break;
            case 'google':
                await googleSvc.revokeGoogle(req, userId, subscriberId, false);
                redirectUri = await googleSvc.integrateGoogle(req, userId, subscriberId);
                break;
            case 'onedrive': 
                await onedriveSvc.revokeOnedrive(req, userId, subscriberId, false);
                redirectUri = await onedriveSvc.integrateOnedrive(req, userId, subscriberId, false);
                break;
            case 'salesforce': 
                await salesforceSvc.revokeSalesforce(req, userId, subscriberId, false);
                redirectUri = await salesforceSvc.integrateSalesforce(req, userId, subscriberId);
                break;
            default:
                throw new IntegrationNotExistError(integration)
        }
        return redirectUri;
    } catch (err) {
        return Promise.reject(err);
    }
};
