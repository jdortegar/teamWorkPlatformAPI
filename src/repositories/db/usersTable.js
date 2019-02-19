import _ from 'lodash';
import config from '../../config/env';
import * as util from './util';
import { UserNotExistError } from '../../services/errors';

/**
 * hash: userId
 * v
 * firstName
 * lastName
 * displayName
 * emailAddress
 * password
 * country
 * timeZone
 * icon
 * defaultLocale
 * enabled
 * presenceStatus
 * bookmarks
 * created
 * lastModified
 * preferences
 *
 * GSI: emailAddressIdx
 * hash: emailAddress
 */
const tableName = () => {
    return `${config.tablePrefix}users`;
};

// Schema Version for readMessages table.
const v = 1;

const upgradeSchema = (req, dbObjects) => {
    return dbObjects.map((dbObject) => {
        let schemaVersion = dbObject.v;

        if (schemaVersion === 1) {
            schemaVersion = 2;
            const params = {
                TableName: tableName(),
                Key: { userId: dbObject.userId },
                UpdateExpression: 'set v = :v, bookmarks = :bookmarks',
                ExpressionAttributeValues: {
                    ':v': schemaVersion,
                    ':bookmarks': {}
                }
            };

            return req.app.locals.docClient.update(params).promise()
                .then(() => {
                    const upgradedDbObject = dbObject;
                    upgradedDbObject.v = schemaVersion;
                    upgradedDbObject.bookmarks = {};
                    return upgradedDbObject;
                });
        }

        return dbObject;
    });
};

export const createUser = (req,
    userId,
    firstName,
    lastName,
    displayName,
    emailAddress,
    password,
    country,
    timeZone,
    icon,
    preferences,
    { defaultLocale = 'en', enabled = true } = {}) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName(),
            Item: {
                userId,
                v,
                firstName,
                lastName,
                displayName,
                emailAddress,
                password,
                country,
                timeZone,
                icon,
                defaultLocale: defaultLocale || 'en',
                enabled: enabled || true,
                presenceStatus: null,
                bookmarks: {},
                created: req.now.format(),
                lastModified: req.now.format(),
                preferences,
                onboarding: true
            }
        };

        req.app.locals.docClient.put(params).promise()
            .then(result => resolve(result.$response.request.rawParams.Item))
            .catch(err => reject(err));
    });
};

export const getUsersByUserIds = (req, userIds) => {
    return new Promise((resolve, reject) => {
        util.batchGet(req, tableName(), 'userId', userIds)
            .then(originalResults => upgradeSchema(req, originalResults))
            .then(latestResults => resolve(latestResults))
            .catch(err => reject(err));
    });
};

export const getUserByUserId = async (req, userId) => {
    const userParams = {
        TableName: tableName(),
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
        ':userId': userId
        }
    };
    const subscriberUserParams = {
        TableName: `${config.tablePrefix}subscriberUsers`,
        IndexName: 'userIdSubscriberOrgIdIdx',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId
        }
    };
    let subscriberUsers = await util.query(req, subscriberUserParams);
    let role = 'user';
    if (subscriberUsers) {
        role = (subscriberUsers instanceof Array && subscriberUsers.length > 0) ? subscriberUsers[0].role : subscriberUsers.role ;
    }
    const originalResults = await util.query(req, userParams);
    const latestResults = upgradeSchema(req, originalResults);
    latestResults.role = role;
    return latestResults;
};

export const getUserByEmailAddress = (req, emailAddress) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName(),
            IndexName: 'emailAddressIdx',
            KeyConditionExpression: 'emailAddress = :emailAddress',
            ExpressionAttributeValues: {
                ':emailAddress': emailAddress
            }
        };

        util.query(req, params)
            .then(originalResults => upgradeSchema(req, originalResults))
            .then(latestResults => resolve((latestResults.length > 0) ? latestResults[0] : undefined))
            .catch(err => reject(err));
    });
};

export const getUsersByEmailAddresses = (req, emailAddresses) => {
    return new Promise((resolve, reject) => {
        Promise.all(emailAddresses.map(emailAddress => getUserByEmailAddress(req, emailAddress)))
            .then(originalResults => _.remove(originalResults))
            .then(originalResults => upgradeSchema(req, originalResults))
            .then(latestResults => resolve(latestResults))
            .catch(err => reject(err));
    });
};

class UpdateExpression {
    updateExpression;
    expressionAttributeValues = {};

    addUpdate(field, value, keyword = false) {
        if (value === undefined) {
            return;
        }

        if (!this.updateExpression) {
            this.updateExpression = 'set';
        } else {
            this.updateExpression += ',';
        }

        if (keyword) {
            this.updateExpression += ` #${field} = :${field}`;
        } else {
            this.updateExpression += ` ${field} = :${field}`;
        }
        this.expressionAttributeValues[`:${field}`] = value;
    }
}

export const updateUser = (req, userId,
    {
        firstName,
        lastName,
        displayName,
        emailAddress,
        password,
        country,
        timeZone,
        icon,
        defaultLocale,
        presenceStatus,
        bookmarks,
        preferences,
        active,
        onboarding
    }) => {
    return new Promise((resolve, reject) => {
        let user;
        const lastModified = req.now.format();
        getUserByUserId(req, userId)
            .then((retrievedUser) => {
                user = retrievedUser[0];
                if (!user) {
                    throw new UserNotExistError(userId);
                }

                const updateExpression = new UpdateExpression();
                updateExpression.addUpdate('firstName', firstName);
                updateExpression.addUpdate('lastName', lastName);
                updateExpression.addUpdate('displayName', displayName);
                updateExpression.addUpdate('emailAddress', emailAddress);
                updateExpression.addUpdate('password', password);
                updateExpression.addUpdate('country', country);
                updateExpression.addUpdate('timeZone', timeZone, true);
                updateExpression.addUpdate('icon', icon);
                updateExpression.addUpdate('defaultLocale', defaultLocale);
                updateExpression.addUpdate('presenceStatus', presenceStatus);
                updateExpression.addUpdate('bookmarks', bookmarks);
                updateExpression.addUpdate('preferences', preferences);
                updateExpression.addUpdate('lastModified', lastModified);
                updateExpression.addUpdate('enabled', active);
                updateExpression.addUpdate('onboarding', onboarding);
                const params = {
                    TableName: tableName(),
                    Key: { userId },
                    UpdateExpression: updateExpression.updateExpression,
                    ExpressionAttributeValues: updateExpression.expressionAttributeValues
                };
                if (timeZone) {
                    params.ExpressionAttributeNames = { '#timeZone': 'timeZone' };
                }
                return req.app.locals.docClient.update(params).promise();
            })
            .then(() => resolve(_.merge({}, user, {
                firstName,
                lastName,
                displayName,
                emailAddress,
                password,
                country,
                timeZone,
                icon,
                defaultLocale,
                presenceStatus,
                bookmarks,
                preferences,
                lastModified,
                active,
            })))
            .catch(err => reject(err));
    });

};
