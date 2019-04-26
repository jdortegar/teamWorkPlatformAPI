import _ from 'lodash';
import uuid from 'uuid';
import axios from 'axios';
import {
    CannotDeactivateError,
    CannotInviteError,
    InvitationNotExistError,
    NoPermissionsError,
    NotActiveError,
    SubscriberOrgNotExistError,
    TeamExistsError,
    TeamNotExistError,
    UserNotExistError,
    TeamMemberExistsError,
    TeamMemberNotExistsError
} from './errors';
import InvitationKeys from '../repositories/InvitationKeys';
import * as invitationsTable from '../repositories/db/invitationsTable';
import * as usersTable from '../repositories/db/usersTable';
import * as subscriberOrgsTable from '../repositories/db/subscriberOrgsTable';
import * as subscriberUsersTable from '../repositories/db/subscriberUsersTable';
import * as teamsTable from '../repositories/db/teamsTable';
import * as teamMembersTable from '../repositories/db/teamMembersTable';
// import * as conversationSvc from './conversationService';
import { deleteInvitation } from '../repositories/cache/invitationsCache';
import { inviteExistingUsersToTeam } from './invitationsUtil';
import {
    teamCreated,
    teamMemberAdded,
    teamPrivateInfoUpdated,
    teamUpdated,
    userInvitationAccepted,
    userInvitationDeclined,
    sentInvitationStatus,
    conversationMemberAdded
} from './messaging';
import { getPresence } from './messaging/presence';
import Roles from './roles';
import config from '../config/env';
import jwt from 'jsonwebtoken';

export const defaultTeamName = 'Project Team One';

export async function getUserTeams(req, userId, subscriberOrgId = undefined) {
    let teamMembers;
    if (subscriberOrgId) {
        console.log('with Sub');
        teamMembers = await teamMembersTable.getTeamMembersByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId);
    } else {
   
        teamMembers = await teamMembersTable.getTeamMembersByUserId(req, userId);
    }
    const teamIds = teamMembers.map(teamMember => teamMember.teamId);
    const teams = await teamsTable.getTeamsByTeamIds(req, teamIds);

    const retTeams = teams.map(team => {
        const teamClone = _.cloneDeep(team);
        teamClone.active = teamClone.subscriberOrgEnabled === false ? false : teamClone.active;
        return teamClone;
    });
    // Doit on this ugly way for dynamodb no relational limitations
    for (let i = 0; i < retTeams.length; i++) {
        retTeams[i].teamAdmin = await teamMembersTable.getTeamAdmin(req, retTeams[i].teamId);
    }
    return retTeams;
}

export const createTeamNoCheck = async (
    req,
    subscriberOrgId,
    teamInfo,
    subscriberUserId,
    user,
    teamAdminUserIds,
    teamId = undefined
) => {
    try {
        console.log('****REQUEST', user, req.headers);

        const token = jwt.sign(user, config.jwtSecret);
        console.log('***USER JWT CREATE TEAM', req.user, config.jwtSecret);
        const actualTeamId = teamId || uuid.v4();
        const icon = teamInfo.icon || null;
        const primary = teamInfo.primary === undefined ? false : teamInfo.primary;
        const preferences = teamInfo.preferences || { private: {} };
        if (preferences.private === undefined) {
            preferences.private = {};
        }
        preferences.iconColor = preferences.iconColor || '#FBBC12';
        let team;
        const teamMemberId = uuid.v4();
        const role = Roles.admin;
        const conversationInfo = await axios.post(`${config.chatApiEndpoint}/conversations`, {
            members: [
                user.userId
            ],
            title: teamInfo.name,
            description: `Conversation for ${teamInfo.name} Team`,
            organization: subscriberOrgId,
            appData: {
                teamId: actualTeamId
            }
        }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
        });
        team = await teamsTable.createTeam(req, actualTeamId, subscriberOrgId, teamInfo.name, icon, primary, preferences, conversationInfo.data.id);
        await teamMembersTable.createTeamMember(req, teamMemberId, user.userId, actualTeamId, subscriberUserId, subscriberOrgId, role);

        teamCreated(req, team, teamAdminUserIds);
        teamMemberAdded(req, team, user, role, teamMemberId);
        return team;
    } catch (err) {
        return Promise.reject(err);
    }
};

export async function createTeam(req, subscriberOrgId, teamInfo, userId, teamId = undefined) {
    try {
        const subscriberOrg = await subscriberOrgsTable.getSubscriberOrgBySubscriberOrgId(req, subscriberOrgId);
        if (!subscriberOrg) {
            throw new SubscriberOrgNotExistError(subscriberOrgId);
        }
        if (subscriberOrg.enabled === false) {
            throw new NotActiveError(subscriberOrgId);
        }
        const subscriberUser = await subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(
            req,
            userId,
            subscriberOrgId
        );
        const existingTeam = await teamsTable.getTeamBySubscriberOrgIdAndName(req, subscriberOrgId, teamInfo.name);
        const user = await usersTable.getUserByUserId(req, userId);
        if (existingTeam) {
            throw new TeamExistsError(teamInfo.name);
        }

        return await createTeamNoCheck(
            req,
            subscriberOrgId,
            teamInfo,
            subscriberUser.subscriberUserId,
            user[0],
            [userId],
            teamId
        );
    } catch (err) {
        return Promise.reject(err);
    }
}

export async function updateTeam(req, teamId, updateInfo, userId) {
    // TODO: Once the roles are in the JWT we need to check this there;
    try {
        const team = await teamsTable.getTeamByTeamId(req, teamId);
        if (!team) {
            throw new TeamNotExistError(teamId);
        }
        const user = await usersTable.getUserByUserId(req, userId);
        const teamMember = await teamMembersTable.getTeamMemberByTeamIdAndUserId(req, teamId, userId);
        if (user.role !== 'admin' || teamMember.role !== 'admin') {
            throw new NoPermissionsError(teamId);
        }
        if (updateInfo.name) {
            const duplicateName = await teamsTable.getTeamBySubscriberOrgIdAndName(
                req,
                team.subscriberOrgId,
                updateInfo.name
            );
            if (duplicateName) {
                throw new TeamExistsError(updateInfo.name);
            }
        }
        const { name, icon, preferences, active } = updateInfo;
        const updatedTeam = await teamsTable.updateTeam(req, teamId, { name, icon, preferences, active });
        if (!updatedTeam.active) {
            deactivateTeamMembers(req, teamId);
        }
        teamUpdated(req, updatedTeam);
        if (updateInfo.preferences && updateInfo.preferences.private) {
            teamPrivateInfoUpdated(req, team);
        }
        return updatedTeam;
    } catch (err) {
        return Promise.reject(err);
    }
}

export function setTeamsOfSubscriberOrgActive(req, subscriberOrgId, active) {
    return new Promise((resolve, reject) => {
        let teams;
        teamsTable
            .updateTeamsBySubscriberOrgId(req, subscriberOrgId, { subscriberOrgEnabled: active })
            .then(updatedTeams => {
                teams = updatedTeams;
                resolve();

                teams.forEach(team => {
                    teamUpdated(req, team);
                });
            })
            .catch(err => reject(err));
    });
}

/**
 * If the team doesn't exist, a TeamNotExistError is thrown.
 *
 * If userId is specified, an additional check is applied to confirm the user is actually a member of the team.
 * If userId is specified and the user is not a member of the team, a NoPermissionsError is thrown.
 *
 * @param req
 * @param teamId
 * @param userId Optional userId to return results only if the user is a team member.
 * @returns {Promise}
 */
export function getTeamUsers(req, teamId, userId = undefined) {
    const userIdsRoles = {};
    const userIdsTeamMemberIds = {};
    let usersWithRoles;

    return new Promise((resolve, reject) => {
        teamMembersTable
            .getTeamMembersByTeamId(req, teamId)
            .then(teamMembers => {
                if (teamMembers.length === 0) {
                    throw new TeamNotExistError(teamId);
                }

                const userIds = teamMembers.map(teamMember => {
                    userIdsRoles[teamMember.userId] = teamMember.role;
                    userIdsTeamMemberIds[teamMember.userId] = teamMember.teamMemberId;
                    return teamMember.userId;
                });
                if (userId && userIds.indexOf(userId) < 0) {
                    throw new NoPermissionsError(teamId);
                }

                return usersTable.getUsersByUserIds(req, userIds);
            })
            .then(users => {
                usersWithRoles = users.map(user => {
                    const ret = _.cloneDeep(user);
                    ret.role = userIdsRoles[user.userId];
                    ret.teamMemberId = userIdsTeamMemberIds[user.userId];
                    return ret;
                });

                const presencePromises = [];
                usersWithRoles.forEach(userWithRoles => {
                    presencePromises.push(getPresence(req, userWithRoles.userId));
                });
                return Promise.all(presencePromises);
            })
            .then(presences => {
                const userIdPresences = {};
                presences.forEach(presence => {
                    if (presence && presence.length > 0) {
                        const presenceNoUserIds = presence.map(p => {
                            const presenceNoUserId = _.cloneDeep(p);
                            delete presenceNoUserId.userId;
                            return presenceNoUserId;
                        });
                        userIdPresences[presence[0].userId] = presenceNoUserIds;
                    }
                });
                usersWithRoles = usersWithRoles.map(userWithRoles => {
                    const clone = _.cloneDeep(userWithRoles);
                    clone.presence = userIdPresences[userWithRoles.userId];
                    return clone;
                });
                resolve(usersWithRoles);
            })
            .catch(err => reject(err));
    });
}

export function inviteMembers(req, teamId, userIds, userId) {
    return new Promise((resolve, reject) => {
        let team;
        let inviteDbUsers;
        let dbUser;
        let subscriberOrg;
        Promise.all([
            teamsTable.getTeamByTeamId(req, teamId),
            teamMembersTable.getTeamMemberByTeamIdAndUserIdAndRole(req, teamId, userId, Roles.admin)
        ])
            .then(([retrievedTeam, teamMember]) => {
                team = retrievedTeam;
                if (!team) {
                    throw new TeamNotExistError(teamId);
                }

                if (!teamMember) {
                    throw new NoPermissionsError(teamId);
                }

                if (team.subscriberOrgEnabled === false || team.active === false) {
                    throw new CannotInviteError(teamId);
                }

                const uniqueUserIds = userIds.reduce((prevList, userIdEntry) => {
                    if (prevList.indexOf(userIdEntry) < 0 && userIdEntry !== userId) {
                        prevList.push(userIdEntry);
                    }
                    return prevList;
                }, []);

                if (uniqueUserIds.length === 0) {
                    throw new CannotInviteError(userId);
                }

                return Promise.all([
                    usersTable.getUsersByUserIds(req, [userId, ...uniqueUserIds]),
                    subscriberOrgsTable.getSubscriberOrgBySubscriberOrgId(req, team.subscriberOrgId)
                ]);
            })
            .then(promiseResults => {
                const existingDbUsers = promiseResults[0].filter(existingDbUser => {
                    if (existingDbUser.userId === userId) {
                        dbUser = existingDbUser;
                        return false;
                    }
                    return true;
                });
                subscriberOrg = promiseResults[1];

                // If any of the userIds are bad, fail.
                if (existingDbUsers.length !== userIds.length) {
                    throw new UserNotExistError();
                }

                // Make sure you don't invite yourself.
                inviteDbUsers = existingDbUsers.filter(existingDbUser => existingDbUser.userId !== userId);
                const inviteDbUserIds = inviteDbUsers.map(inviteDbUser => inviteDbUser.userId);

                // Make sure invitees are not already in here.
                return Promise.all(
                    inviteDbUserIds.map(inviteDbUserId =>
                        teamMembersTable.getTeamMemberByTeamIdAndUserId(req, teamId, inviteDbUserId)
                    )
                );
            })
            .then(retrievedTeamMembersOfTeam => {
                const teamMembersOfTeam = _.remove(retrievedTeamMembersOfTeam);
                if (teamMembersOfTeam.length !== 0) {
                    const doNotInviteUserIds = teamMembersOfTeam.map(teamMember => teamMember.userId);
                    inviteDbUsers = inviteDbUsers.filter(
                        inviteDbUser => doNotInviteUserIds.indexOf(inviteDbUser.userId) < 0
                    );
                }
                return inviteExistingUsersToTeam(req, dbUser, inviteDbUsers, subscriberOrg, team);
            })
            .then(() => resolve())
            .catch(err => reject(err));
    });
}

export function addUserToTeam(req, user, subscriberUserId, teamId, role) {
    console.log('USER:          ', user);
    return new Promise((resolve, reject) => {
        let team;
        const teamMemberId = uuid.v4();
        teamsTable
            .getTeamByTeamId(req, teamId)
            .then(retrievedTeam => {
                team = retrievedTeam;
                if (!team) {
                    throw new TeamNotExistError(teamId);
                }
                return teamMembersTable.createTeamMember(
                    req,
                    teamMemberId,
                    user[0].userId,
                    teamId,
                    subscriberUserId,
                    team.subscriberOrgId,
                    role
                );
            })
            .then(member => {
                teamMemberAdded(req, team, user[0], role, teamMemberId);
                conversationMemberAdded(req, user[0], teamId);
                // return conversationSvc.addUserToConversationByTeamId(req, user[0], teamId);
            })
            .then(() => {
                resolve(teamMemberId);
            })
            .catch(err => reject(err));
    });
}

export function addUserToPrimaryTeam(req, user, subscriberOrgId, subscriberUserId, role) {
    return new Promise((resolve, reject) => {
        teamsTable
            .getTeamBySubscriberOrgIdAndPrimary(req, subscriberOrgId, true)
            .then(team => {
                if (team) {
                    return addUserToTeam(req, user, subscriberUserId, team.teamId, role);
                }
                return undefined;
            })
            .then(() => resolve())
            .catch(err => reject(err));
    });
}

export function replyToInvite(req, teamId, accept, userId) {
    return new Promise((resolve, reject) => {
        let user;
        let team;
        let cachedInvitation;
        Promise.all([
            usersTable.getUserByUserId(req, userId),
            teamsTable.getTeamByTeamId(req, teamId),
            teamMembersTable.getTeamMemberByTeamIdAndUserId(req, teamId, userId)
        ])
            .then(([retrievedUser, retrievedTeam, teamMember]) => {
                user = retrievedUser;
                team = retrievedTeam;
                if (!user) {
                    throw new UserNotExistError();
                }

                if (!team) {
                    throw new TeamNotExistError(teamId);
                }

                if (teamMember) {
                    throw new TeamMemberExistsError(`teamId=${teamId}, userId=${userId}`);
                }
                return deleteInvitation(req, user[0].emailAddress, InvitationKeys.teamId, teamId);
            })
            .then(retrievedCachedInvitation => {
                cachedInvitation = retrievedCachedInvitation;
                if (cachedInvitation && team.subscriberOrgEnabled) {
                    if (team.active && accept) {
                        const { subscriberOrgId } = cachedInvitation;
                        userInvitationAccepted(req, cachedInvitation, userId);
                        return subscriberUsersTable.getSubscriberUserByUserIdAndSubscriberOrgId(req, userId, subscriberOrgId);
                    } else if (!accept) {
                        userInvitationDeclined(req, cachedInvitation, userId);
                    }
                    return undefined;
                }
                throw new InvitationNotExistError(teamId);
            })
            .then(subscriberUser => {
                if (subscriberUser) {
                    const { subscriberUserId } = subscriberUser;
                    return addUserToTeam(req, user, subscriberUserId, teamId, Roles.user);
                }
                return undefined;
            })
            .then(() => {
                const state = accept ? 'ACCEPTED' : 'DECLINED';
                return invitationsTable.updateInvitationsStateByInviteeEmail(
                    req,
                    user[0].emailAddress,
                    InvitationKeys.teamId,
                    teamId,
                    state
                );
            })
            .then(changedInvitations => {
                resolve();
                sentInvitationStatus(req, changedInvitations[0]);
            })
            .catch(err => {
                if (err instanceof TeamMemberExistsError) {
                    resolve();
                } else {
                    reject(err);
                }
            });
    });
}

export const deactivateTeamMembers = async (req, teamId) => {
    const teamMembers = await teamMembersTable.getTeamMembersByTeamId(req, teamId);
    const deactivateTeamMember = async member => {
        try {
            await teamMembersTable.updateTeamMemberActive(req, member.teamMemberId, false);
        } catch (err) {
            return Promise.reject(err);
        }
    };
    if (teamMembers) {
        teamMembers.forEach(deactivateTeamMember);
    }
};

export const deactivateTeamMembersByUserId = async (req, userId) => {
    try {
        const teamMembers = await teamMembersTable.getTeamMembersByUserId(req, userId);
        _.forEach(teamMembers, val => {
            teamMembersTable.updateTeamMemberActive(req, val.teamMemberId, false);
        });
    } catch (err) {
        console.log('ERROR: ', err);
    }
};

export const updateTeamMember = async (req, userId, teamId, body) => {
    try {
        const teamMember = await teamMembersTable.getTeamMemberByTeamIdAndUserId(req, teamId, userId);
        if (!teamMember) {
            throw new TeamMemberNotExistsError(userId, teamId);
        }
        if (typeof body.active !== 'undefined') {
            await teamMembersTable.updateTeamMemberActive(req, teamMember.teamMemberId, body.active);
            teamMember.enabled = body.active;
        }
        return teamMember;
    } catch (err) {
        Promise.reject(err);
    }
};
