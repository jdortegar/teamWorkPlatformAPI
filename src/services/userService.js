import _ from 'lodash';
import uuid from 'uuid';
import moment from 'moment';
import config from '../config/env';
import { NoPermissionsError, UserNotExistError, CustomerExistsError, UserLimitReached, SubscriptionNotExists } from './errors';
import { getRandomColor } from './util';
import { hashPassword, passwordMatch } from '../models/user';
import { deactivateTeamMembersByUserId } from './teamService';
import invitationsKeys from '../repositories/InvitationKeys';
import * as usersTable from '../repositories/db/usersTable';
import * as usersCache from '../repositories/cache/usersCache';
import * as invitationsRepo from '../repositories/invitationsRepo';
import * as awsMarketplaceSvc from './awsMarketplaceService';
import * as subscriberOrgSvc from './subscriberOrgService';
import * as subscriberUserTable from '../repositories/db/subscriberUsersTable';
import * as invitationsTable from '../repositories/db/invitationsTable';
import * as subscriberOrgsTable from '../repositories/db/subscriberOrgsTable';
import * as teamSvc from './teamService';
import { userCreated, userUpdated, userPrivateInfoUpdated, userBookmarksUpdated, sentInvitationStatus } from './messaging';
import { AWS_CUSTOMER_ID_HEADER_NAME } from '../controllers/auth';
import * as mailer from '../helpers/mailer';
import moment from 'moment';

export const getUserByEmail = (req, email) => {
    return new Promise((resolve, reject) => {
        let user;
        usersTable.getUserByEmailAddress(req, email)
            .then((retrievedUser) => {
                user = retrievedUser;
                if (user) {
                    return usersCache.createUser(req, email, user.userId);
                }
                return undefined;
            })
            .then(() => resolve(user))
            .catch(err => reject(err));
    });
};

export const login = async (req, email, password) => {
    try {
        const user = await getUserByEmail(req, email);
        if (!user || !passwordMatch(user, password)) {
            throw new NoPermissionsError(email);
        }
        const subscriberUser = await subscriberUserTable.getSubscriberUsersByUserId(req, user.userId);
        user.role = subscriberUser[0].role;
        return user
    } catch (err) {
        return Promise.reject(err);
    }
};

export const createUser = async (req, userInfo) => {
    const { email: emailAddress } = userInfo;
    const userId = uuid.v4();
    let user;
    try {
        const existingUser = await usersTable.getUserByEmailAddress(req, emailAddress);
        if (existingUser) {
            throw new  NoPermissionsError(emailAddress);
        }
        const { firstName, lastName, displayName, country, timeZone } = userInfo;
        const password = hashPassword(userInfo.password);
        const icon = userInfo.icon || null;
        const preferences = userInfo.preferences || { private:  {} };
        if (typeof preferences.private === 'undefined') {
            preferences.private = {};
        }
        preferences.iconColor = preferences.iconColor || getRandomColor();
        preferences.customPresenceStatusMessage = preferences.customPresenceStatusMessage || 'Available';
        user = await usersTable.createUser(req, userId, firstName, lastName, displayName, emailAddress, password, country, timeZone, icon, preferences);
        await usersCache.createUser(req, emailAddress, userId);
        // Check if there are invitations if not create a new organization.
        const invitations = await getInvitations(req, emailAddress);
        if (invitations instanceof Array && invitations.length > 0) {
            // Here we need to create a normal user to suscriber user and reply the invite.
            const subscriberOrgId = invitations[0].subscriberOrgId;
            const organization = await subscriberOrgsTable.getSubscriberOrgBySubscriberOrgId(req, invitations[0].subscriberOrgId);
            const userLimit = organization.userLimit || 9;
            const orgActiveUsers = await subscriberOrgSvc.getOrganizationActiveUsers(req, organization.subscriberOrgId);
            if (userLimit <= orgActiveUsers.length) {
                throw new UserLimitReached(userLimit);
            }
            const subscriberUserId = uuid.v4();
            const subscriberUser = await subscriberUserTable.createSubscriberUser(req, subscriberUserId, userId, invitations[0].subscriberOrgId, 'user', user.displayName);
            const changedInvitations = await invitationsTable.updateInvitationsStateByInviteeEmail(req, user.emailAddress, invitationsKeys.subscriberOrgId, invitations[0].subscriberOrgId, 'ACCEPTED');
            // Create default Team.
            const teamInfo = {
                name: `${firstName}'s Project Team`
            }
            const team = await teamSvc.createTeamNoCheck(req, invitations[0].subscriberOrgId, teamInfo, subscriberUserId, user);
            sentInvitationStatus(req, changedInvitations[0]);
            await req.app.locals.redis.delAsync(`${user.emailAddress}#pendingInvites`);
            userCreated(req, user, subscriberOrgId);
        } else {
            const subscriberOrgId = uuid.v4();
            const subscriberOrgName = req.body.displayName;
            const stripeSubscriptionId = await req.app.locals.redis.getAsync(`${config.redisPrefix}${emailAddress}#stripeSubscriptionId`) || null;
            const paypalSubscriptionId = await req.app.locals.redis.getAsync(`${config.redisPrefix}${emailAddress}#paypalSubscriptionId`) || null;
            console.log('***CACHE DATA', `${config.redisPrefix}${emailAddress}#stripeSubscriptionId`, stripeSubscriptionId, paypalSubscriptionId);
            if(!stripeSubscriptionId && !paypalSubscriptionId){
                throw new SubscriptionNotExists();
            }
            const userLimit = await req.app.locals.redis.getAsync(`${config.redisPrefix}${emailAddress}#userLimit`) || 9;
            // Geta subscription data from redis
            const subscriptionStatus = await req.app.locals.redis.getAsync(`${config.redisPrefix}${emailAddress}#subscriptionStatus`);
            const subscriptionExpireDate = await req.app.locals.redis.getAsync(`${config.redisPrefix}${emailAddress}#subscriptionExpireDate`);
	        await subscriberOrgSvc.createSubscriberOrgUsingBaseName(req, { name: subscriberOrgName }, user, subscriberOrgId, stripeSubscriptionId, paypalSubscriptionId, undefined, userLimit, subscriptionStatus, subscriptionExpireDate);
        }
        const awsCustomerId = await req.app.locals.redis.getAsync(`${config.redisPrefix}${emailAddress}#awsCustomerId`);
        if (awsCustomerId && (awsCustomerId !== null)) {
            await awsMarketplaceSvc.registerCustomer(req, awsCustomerId, user);
        }
    } catch (err) {
        return Promise.reject(err);
    }
};

export const updateUser = (req, userId, updateInfo) => {
    return new Promise((resolve, reject) => {
        usersTable.updateUser(req, userId, updateInfo)
            .then(async (user) => {
                const orgId = await subscriberOrgSvc.getUserSubscriberOrgs(req, userId);
                userUpdated(req, user, orgId[0].subscriberOrgId);
                if ((updateInfo.preferences) && (updateInfo.preferences.private)) {
                    userPrivateInfoUpdated(req, user);
                }
                if (updateInfo.active === false) {
                    deactivateTeamMembersByUserId(req, userId);
                }
            }).then(()=>{
                const user = usersTable.getUserByUserId(req, userId)
                resolve(user);
            })
            .catch(err => reject(err));
    });
};

export const updatePassword = (req, userId, oldPassword, newPassword) => {
    return new Promise((resolve, reject) => {
        usersTable.getUserByUserId(req, userId)
            .then((user) => {
                if (!user) {
                    throw new UserNotExistError(userId);
                }

                if (passwordMatch(user, oldPassword)) {
                    const hashedPassword = hashPassword(newPassword);
                    return usersTable.updateUser(req, userId, { password: hashedPassword });
                }
                throw new Error('Incorrect Password!');
            })
            .then((user) => {
                resolve(user);
                // userPasswordUpdated(req, user);
            })
            .catch(err => reject(err));
    });
};

export const resetPassword = (req, email, password) => {
    return new Promise((resolve, reject) => {
        usersTable.getUserByEmailAddress(req, email)
            .then((user) => {
                if (!user) {
                    throw new UserNotExistError(email);
                }

                const hashedPassword = hashPassword(password);
                return usersTable.updateUser(req, user.userId, { password: hashedPassword });
            })
            .then((user) => {
                resolve(user);
                // userPasswordUpdated(req, user);
            })
            .catch((err) => {
                reject(err)
            } );
    });
};

export const getInvitations = (req, email) => {
    return new Promise((resolve, reject) => {
        invitationsRepo.getInvitationsByInviteeEmail(req, email)
            .then((invitations) => {
                if (invitations === null) {
                    resolve([]);
                } else {
                    // Multiple invitations get be sent out to a person for a specific org/team/room.  Only need the last one.
                    const uniqueInvitations = [];
                    invitations.forEach((invitation) => {
                        _.remove(uniqueInvitations, (uniqueInvitation) => {
                            return (
                                (uniqueInvitation.subscriberOrgId === invitation.subscriberOrgId) &&
                                (uniqueInvitation.teamId === invitation.teamId)
                            );
                        });
                        uniqueInvitations.push(invitation);
                    });
                    resolve(uniqueInvitations);
                }
            })
            .catch(err => reject(err));
    });
};

export const getSentInvitations = (req, userId, { since = undefined, state = undefined }) => {
    return new Promise((resolve, reject) => {
        invitationsRepo.getInvitationsByInviterUserId(req, userId, { since, state })
            .then((invitations) => {
                if (invitations === null) {
                    resolve([]);
                } else {
                    resolve(invitations);
                }
            })
            .catch(err => reject(err));
    });
};

export const getUserNameHash = async (req, userIds = []) => {
    const users = await usersTable.getUsersByUserIds(req, userIds);
    const hash = {};
    _.forEach(users, (user) => {
        hash[user.userId] = `${user.firstName} ${user.lastName}`
    });
    return hash;
};

export const createReservation = async (req, reservationData) => {
    try {
        const { email } = reservationData || '';
        const { stripeSubscriptionId } = reservationData || null;
        const { paypalSubscriptionId } = reservationData || null;
        const awsCustomerId = req.get(AWS_CUSTOMER_ID_HEADER_NAME);
        const { userLimit } = reservationData || 9;
        const { subscriptionStatus } = reservationData || 'trialing';
        const { subscriptionExpireDate } = reservationData || 0;
        // Add new reservation to cache
        req.logger.debug(`createReservation: user ${email}`);
        const rid = String(moment().valueOf()).slice(-6);
        req.logger.debug(`createReservation: new rid: ${rid}`);
        req.app.locals.redis.set(`${config.redisPrefix}#reservation#${rid}`, email, 'EX', 1800, err => {
            if (err) {
                req.logger.debug('createReservation: set status - redis error');
            } else {
                req.logger.debug(`createReservation: created reservation for email: ${email}`);
                mailer.sendConfirmationCode(email, rid)
            }
        });
    
        if (awsCustomerId) {
            await req.app.locals.redis.setAsync(`${config.redisPrefix}${email}#awsCustomerId`, awsCustomerId);
        }
    
        // If User comes from stripe
        if (stripeSubscriptionId) {
           await req.app.locals.redis.setAsync(`${config.redisPrefix}${email}#stripeSubscriptionId`, stripeSubscriptionId);
        }
    
        // If User comes from paypal
        if (paypalSubscriptionId) {
            await req.app.locals.redis.setAsync(`${config.redisPrefix}${email}#paypalSubscriptionId`, paypalSubscriptionId);
        }
    
        // Subcriptions data
        await req.app.locals.redis.setAsync(`${config.redisPrefix}${email}#subscriptionStatus`, subscriptionStatus);
        await req.app.locals.redis.setAsync(`${config.redisPrefix}${email}#subscriptionExpireDate`, subscriptionExpireDate);
        await req.app.locals.redis.setAsync(`${config.redisPrefix}${email}#userLimit`, userLimit);
    } catch (err) { 
        console.log('SUBSCRIPTION ERROR', err);
        return Promise.reject(err);
    }
};
