import _ from 'lodash';
import moment from 'moment';
import uuid from 'uuid';
import * as teamSvc from './teamService';
import * as conversationsTable from '../repositories/db/conversationsTable';
import * as conversationParticipantsTable from '../repositories/db/conversationParticipantsTable';
import * as messagesTable from '../repositories/db/messagesTable';
import * as readMessagesTable from '../repositories/db/readMessagesTable';
import * as userMessageTable from '../repositories/db/userMessageTable';
import * as usersTable from '../repositories/db/usersTable';
import * as messagesCache from '../repositories/cache/messagesCache';
import {
    conversationCreated,
    conversationUpdated,
    messageCreated,
    messageRead,
    messageUpdated,
    messageDeleted,
    messageLiked,
    messageDisliked,
    messageFlagged
} from './messaging';
import { updateCachedByteCount } from './awsMarketplaceService';
import { ConversationNotExistError, NoPermissionsError, NotActiveError, MessageNotExistError } from './errors';

const MESSAGE_PATH_SEPARATOR = '##';


const convertParticipantsToUsers = (req, conversationParticipantsUserIds) => {
    const userIds = new Set();
    conversationParticipantsUserIds.forEach((participants) => {
        participants.forEach(userId => userIds.add(userId));
    });

    return new Promise((resolve, reject) => {
        usersTable.getUsersByUserIds(req, Array.from(userIds))
            .then((users) => {
                const usersMap = {};
                users.forEach((user) => {
                    usersMap[user.userId] = user;
                });

                // Replace userIds in `conversationParticipantsUserIds` to actual user info.
                const conversationsUsers = conversationParticipantsUserIds.map((conversationParticipants) => {
                    const conversationUsers = conversationParticipants.map(userId => usersMap[userId]);
                    return conversationUsers;
                });
                resolve(conversationsUsers);
            })
            .catch(err => reject(err));
    });
};

const ensureConversationStatsExistInCache = (req, conversations) => {
    conversations.forEach((conversation) => {
        const { conversationId } = conversation;
        messagesCache.isStatsForConversationIdExist(req, conversationId)
            .then((exists) => {
                if (!exists) {
                    const { messageCount, byteCount, lastCreated } = conversation;
                    if (messageCount) {
                        return messagesCache.setMessageCountAndLastTimestampAndByteCountIfNotExist(req, messageCount, lastCreated, byteCount, conversationId);
                    }
                }
                return undefined;
            })
            .then((isNew) => {
                if (isNew) {
                    return messagesTable.getParentMessagesByConversationId(req, conversationId);
                }
                return undefined;
            })
            .then((parentMessages) => {
                if (parentMessages) {
                    const promises = [];
                    parentMessages.forEach((parentMessage) => {
                        promises.push(messagesCache.setMessageCountAndLastTimestampAndByteCountIfNotExist(
                            req, parentMessage.messageCount, parentMessage.lastCreated, undefined, conversationId, parentMessage.messageId));
                    });
                    return promises;
                }
                return undefined;
            })
            .catch(err => req.logger.error(`Error ensureConversationStatsExistInCache for conversationId=${conversation.conversationId}:  ${err}`));
    });
};

/**
 * Retrieve all conversations that the specified user is privy to.
 * If the optional 'teamId' is specified, the results are narrowed down to conversations of the team.
 *
 * @param req
 * @param userId
 * @param teamId
 * @returns {Promise}
 */
export const getConversations = (req, userId, teamId = undefined) => {
    return new Promise((resolve, reject) => {
        let conversations;
        conversationParticipantsTable.getConversationParticipantsByUserId(req, userId)
            .then((conversationParticipants) => {
                const conversationIds = conversationParticipants.reduce((prevValue, conversationParticipant) => {
                    if (teamId) {
                        if (conversationParticipant.teamId === teamId) {
                            prevValue.push(conversationParticipant.conversationId);
                        }
                    } else {
                        prevValue.push(conversationParticipant.conversationId);
                    }
                    return prevValue;
                }, []);

                return conversationsTable.getConversationsByConversationIds(req, conversationIds);
            })
            .then((retrievedConversations) => {
                conversations = retrievedConversations;
                console.log(conversations);
                const promises = [];
                conversations.forEach((conversation) => {
                    promises.push(conversationParticipantsTable.getConversationParticipantsByConversationId(req, conversation.conversationId));
                });
                return Promise.all(promises);
            })
            .then((participantsPerConversations) => {
                const conversationParticipantsUserIds = [];
                participantsPerConversations.forEach((participantsPerConversation) => {
                    const participantUserIds = participantsPerConversation.map((participant) => {
                        return participant.userId;
                    });
                    conversationParticipantsUserIds.push(participantUserIds);
                });

                return convertParticipantsToUsers(req, conversationParticipantsUserIds);
            })
            .then((conversationsUsers) => {
                let idx = 0;
                conversations = conversations.map((conversation) => {
                    const clone = _.cloneDeep(conversation);
                    clone.participants = conversationsUsers[idx];
                    idx += 1;
                    return clone;
                });
            })
            .then(() => resolve(conversations))
            .then(() => ensureConversationStatsExistInCache(req, conversations))
            .catch(err => reject(err));
    });
};

export const createConversationNoCheck = (req, subscriberOrgId, teamId, userId, conversationParticipantUserIds, topic = undefined, members = []) => {
    const actualConversationId = uuid.v4();

    return new Promise((resolve, reject) => {
        let conversation;
        conversationsTable.createConversation(req, actualConversationId, subscriberOrgId, teamId, topic, members)
            .then((retrievedConversation) => {
                conversation = retrievedConversation;
                return conversationParticipantsTable.createConversationParticipant(req, actualConversationId, userId, teamId);
            })
            .then(() => usersTable.getUserByUserId(req, userId))
            .then((user) => {
                const participant = user;
                participant.userId = userId;
                conversation.participants = [participant];
                conversation.conversationId = actualConversationId;
            })
            .then(() => {
                conversationCreated(req, conversation, conversationParticipantUserIds);
                resolve(conversation);
            })
            .then(() => {
                return Promise.all([
                    readMessagesTable.createReadMessages(req, userId, actualConversationId),
                    messagesCache.setMessageCountAndLastTimestampAndByteCountIfNotExist(req, 0, req.now.format(), 0, actualConversationId)
                ]);
            })
            .catch(err => reject(err));
    });
};

export const createDirectConversation = async (req, subscriberOrgId, members, topic = undefined) => {
    try {
        const currentConversations = await conversationsTable.getDirectConversation(req, members);
        if (currentConversations.length > 0) {
            return currentConversations[0];
        }
        const conversationId = uuid.v4();
        const conversation = await conversationsTable.createConversation(req, conversationId, subscriberOrgId, undefined, topic, members);
        const users = [];
        _.forEach(members, async (val) => {
            await conversationParticipantsTable.createConversationParticipant(req, conversationId, val);
            const user = await usersTable.getUserByUserId(req, val);
            users.push(user);
        });
        conversation.participants = [];
        _.forEach(users, async (user) => {
            const participant = user;
            participant.userId = user.userId;
            conversation.participants.push(participant);
            await readMessagesTable.createReadMessages(req, user.userId, conversationId);
            await messagesCache.setMessageCountAndLastTimestampAndByteCountIfNotExist(req, 0, req.now.format(), 0, conversationId);
        });
        conversation.conversationId = conversationId;
        conversationCreated(req, conversation, members);
        return conversation;
    } catch (err) {
        return Promise.reject(err);
    }
}

export const addUserToConversationByTeamId = (req, user, teamId) => {
    return new Promise((resolve, reject) => {
        let conversationId;
        conversationsTable.getConversationByTeamId(req, teamId)
            .then((conversation) => {
                if (conversation) {
                    conversationId = conversation.conversationId;
                    return conversationParticipantsTable.createConversationParticipant(req, conversationId, user.userId, teamId);
                }
                return undefined;
            })
            .then(() => readMessagesTable.createReadMessages(req, user.userId, conversationId))
            .then(() => resolve())
            .catch(err => reject(err)); sortMessagesArray
    });
};

const sortMessagesArray = (messages) => {
    let sortedMessages = messages.sort((msg1, msg2) => {
        const epoch1 = moment(msg1.created).unix();
        const epoch2 = moment(msg2.created).unix();
        if (epoch1 === epoch2) {
            return 0;
        } else if (epoch1 < epoch2) {
            return -1;
        }
        return 1;
    });

    // Sort message threads.
    sortedMessages = sortedMessages.map((message) => {
        if (message.thread) {
            const clone = _.cloneDeep(message);
            clone.thread = sortMessagesArray(message.thread);
            return clone;
        }
        return message;
    });

    return sortedMessages;
};

const flattenMessagesArray = (messages) => {
    let flattenedMessages = [];
    messages.forEach((message) => {
        flattenedMessages.push(message);
        if (message.thread) {
            flattenedMessages = [...flattenedMessages, ...flattenMessagesArray(message.thread)];
            delete message.thread; // eslint-disable-line no-param-reassign
        }
    });
    return flattenedMessages;
};

const sortMessages = (messages) => {
    const messageMap = new Map();
    const topLevelMessages = [];
    const threadMessages = [];

    // Put all messages in a map for quick access.  Create top-level messages.
    messages.forEach((message) => {
        messageMap.set(message.messageId, message);
        if ((message.replyTo === undefined) || (message.replyTo === null)) {
            topLevelMessages.push(message);
        } else {
            threadMessages.push(message);
        }
    });

    // Add all threaded messages to their parent.
    threadMessages.forEach((message) => {
        const parent = messageMap.get(message.replyTo);
        if (parent) {
            parent.thread = parent.thread || [];
            parent.thread.push(message);
        }
    });

    // Sort it.
    const sortedMessages = sortMessagesArray(topLevelMessages);

    // Flatten it.
    const flattenedMessages = flattenMessagesArray(sortedMessages);

    return flattenedMessages;
};

// TODO:
export const getBookmarkedMessages = (req, userId) => { // eslint-disable-line no-unused-vars
    return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
    });
};

/**
 * If the conversation doesn't exist, a ConversationNotExistError is thrown.
 *
 * If userId is specified, an additional check is applied to confirm the user is actually a member of the team room of the conversation.
 * If userId is specified and the user is not a member of the team room, a NoPermissionsError is thrown.
 *
 * @param req
 * @param conversationId
 * @param userId Optional userId to return results only if the user is a team room member.
 * @returns {Promise}
 */
export const getMessages = (req, conversationId, userId = undefined, { since, until, minLevel, maxLevel, maxCount }) => {
    return new Promise((resolve, reject) => {
        conversationsTable.getConversationByConversationId(req, conversationId)
            .then((conversation) => {
                if (!conversation) {
                    throw new ConversationNotExistError(conversationId);
                }

                if (userId && typeof conversation.teamId !== 'undefined') {
                    const { teamId } = conversation;
                    return teamSvc.getTeamUsers(req, teamId, userId);
                }
                return undefined;
            })
            .then(() => {
                return messagesTable.getMessagesByConversationIdFiltered(req, conversationId, { since, until, minLevel, maxLevel });
            })
            .then(messages => sortMessages(messages))
            .then((messages) => {
                if ((typeof maxCount !== 'undefined') && (messages.length > maxCount)) {
                    return messages.slice(messages.length - maxCount, messages.length);
                }
                return messages;
            })
            .then(messages => resolve(messages))
            .catch(err => reject(err));
    });
};

/**
 * One of userId or conversationId must be defined.
 *
 * @param req
 * @param userId
 * @param conversationId
 * @returns {Promise<any>}
 */
const constructReadMessages = (req, userId = undefined, conversationId = undefined) => {
    return new Promise((resolve, reject) => {
        let allReadMessages;
        let promise;
        if (userId) {
            if (conversationId) {
                promise = readMessagesTable.getReadMessagesByUserIdAndConversationId(req, userId, conversationId);
            } else {
                promise = readMessagesTable.getReadMessagesByUserId(req, userId);
            }
        } else {
            promise = Promise.resolve({ conversationId });
        }
        promise
            .then((retrievedAllReadMessages) => {
                allReadMessages = (retrievedAllReadMessages instanceof Array) ? retrievedAllReadMessages : [retrievedAllReadMessages];
                const transcriptStatsPromises = [];
                allReadMessages.forEach((readMessages) => {
                    transcriptStatsPromises.push(messagesCache.getRecursiveMessageCountAndLastTimestampByConversationId(req, readMessages.conversationId));
                });

                return (transcriptStatsPromises.length > 0) ? Promise.all(transcriptStatsPromises) : undefined;
            })
            .then((transcriptStats) => {
                const readMessagesResponse = { userId, conversationIds: {} };
                let idx = 0;
                allReadMessages.forEach((readMessages) => {
                    const transcriptStat = transcriptStats[idx] || {};
                    const conversationStats = {
                        messageCount: transcriptStat.messageCount,
                        lastTimestamp: transcriptStat.lastTimestamp,
                        lastReadMessageCount: readMessages.lastReadMessageCount,
                        lastReadTimestamp: readMessages.lastReadTimestamp,
                        byteCount: (transcriptStat.byteCount === null) ? 0 : Number(transcriptStat.byteCount)
                    };

                    if (transcriptStat.parentMessages) {
                        conversationStats.parentMessages = transcriptStat.parentMessages;
                        Object.keys(conversationStats.parentMessages).forEach((parentMessageId) => {
                            const messagesThread = conversationStats.parentMessages[parentMessageId];
                            const userReadMessageThread = readMessages.parentMessageIds[parentMessageId];

                            if (userReadMessageThread) {
                                messagesThread.lastReadMessageCount = userReadMessageThread.lastReadMessageCount;
                                messagesThread.lastReadTimestamp = userReadMessageThread.lastReadTimestamp;
                            } else {
                                messagesThread.lastReadMessageCount = 0;
                                messagesThread.lastReadTimestamp = '0000-00-00T00:00:00Z';
                            }

                            conversationStats.parentMessages[parentMessageId] = messagesThread;
                        });
                    }

                    readMessagesResponse.conversationIds[readMessages.conversationId] = conversationStats;

                    idx += 1;
                });

                resolve(readMessagesResponse);
            })
            .catch(err => reject(err));
    });
};

export const getReadMessages = (req, userId, conversationId = undefined) => {
    return new Promise((resolve, reject) => {
        let checkPermissionsPromise;
        if (conversationId) {
            checkPermissionsPromise = conversationParticipantsTable.getConversationParticipantByConversationIdAndUserId(req, conversationId, userId);
        } else {
            checkPermissionsPromise = Promise.resolve();
        }

        checkPermissionsPromise
            .then((conversationParticipant) => {
                if ((conversationId) && ((!conversationParticipant) || (conversationParticipant.userId !== userId))) {
                    throw new NoPermissionsError(conversationId);
                }

                return constructReadMessages(req, userId, conversationId);
            })
            .then(readMessagesResponse => resolve(readMessagesResponse))
            .catch(err => reject(err));
    });
};

export const readMessage = (req, userId, conversationId, messageId = undefined) => {
    return new Promise((resolve, reject) => {
        messagesTable.getMessageByConversationIdAndMessageId(req, conversationId, messageId)
            .then((message) => {
                if (!message) {
                    throw new ConversationNotExistError(`conversationId=${conversationId}, messageId=${messageId}`);
                }

                const { replyTo: parentMessageId, messageNumber: lastReadMessageCount, created: lastReadTimestamp } = message;
                return readMessagesTable.updateReadMessages(req, userId, conversationId, lastReadTimestamp, lastReadMessageCount, parentMessageId);
            })
            .then(() => constructReadMessages(req, userId, conversationId))
            .then((readMessagesResponse) => {
                resolve(readMessagesResponse);
                messageRead(req, readMessagesResponse, userId);
            })
            .catch(err => reject(err));
    });
};

const byteCountOfContent = (content) => {
    let byteCount = 0;
    content.forEach((entry) => {
        if ((entry.meta) && (entry.meta.fileSize)) {
            byteCount += entry.meta.fileSize;
        } else if (entry.type === 'text/plain') {
            byteCount += Buffer.byteLength(entry.text, 'utf8');
        }
    });
    return byteCount;
};

export const createMessage = (req, conversationId, userId, content, replyTo) => {
    return new Promise((resolve, reject) => {
        const messageId = uuid.v4();
        let subscriberOrgId;

        let conversation;
        const byteCount = byteCountOfContent(content);
        let message;

        Promise.all([
            conversationParticipantsTable.getConversationParticipantsByConversationId(req, conversationId),
            conversationsTable.getConversationByConversationId(req, conversationId)
        ])
            .then((promiseResults) => {
                const participants = promiseResults[0];
                conversation = promiseResults[1];

                if (conversation.active === false) {
                    throw new NotActiveError(conversationId);
                }
                subscriberOrgId = conversation.subscriberOrgId;

                const userIds = participants.map(participant => participant.userId);
                if (userIds.indexOf(userId) < 0) {
                    throw new NoPermissionsError(conversationId);
                }

                if (replyTo) {
                    return conversationsTable.incrementConversationByteCount(req, conversationId, byteCount);
                }
                return conversationsTable.incrementConversationMessageCountAndByteCount(req, conversationId, byteCount);
            })
            .then((updatedConversation) => {
                conversation = updatedConversation;
                if (replyTo) {
                    return messagesTable.incrementMessageMessageCount(req, conversationId, replyTo);
                }
                return undefined;
            })
            .then((replyToMessage) => {
                let level = 0;
                let path = messageId;
                if (replyToMessage) {
                    level = ((replyToMessage.level) ? replyToMessage.level : 0) + 1;
                    path = (replyToMessage.path) ? replyToMessage.path : '';
                    path = `${path}${MESSAGE_PATH_SEPARATOR}${messageId}`;
                }

                return messagesTable.createMessage(
                   req,
                   conversationId,
                   messageId,
                   level,
                   path,
                   content,
                   replyToMessage ? replyToMessage.messageCount : conversation.messageCount,
                   byteCount,
                   userId,
                   replyTo
                );
            })
            .then((createdMessage) => {
                message = createdMessage;
                return updateCachedByteCount(req, subscriberOrgId, byteCount);
            })
            .then(() => {
                message.messageId = messageId;
                resolve(message);
                messageCreated(req, message);

                return messagesCache.incrementMessageCountAndLastTimestampAndByteCount(req, message.created, byteCount, conversationId, message.replyTo);
            })
            .then(() => constructReadMessages(req, undefined, conversationId))
            .then((readMessagesResponse) => {
                messageRead(req, readMessagesResponse);
            })
            .catch(err => reject(err));
    });
};

export const getMessagesByConversationIdsAndMessageIds = (req, conversationIdsMessageIds) => {
    const promises = conversationIdsMessageIds.map(({ conversationId, messageId }) => {
        return messagesTable.getMessageByConversationIdAndMessageId(req, conversationId, messageId);
    });
    return Promise.all(promises);
};

export const updateMessage = (req, conversationId, messageId, userId, content) => {
    return new Promise((resolve, reject) => {
        const byteCount = byteCountOfContent(content);
        let message;
        let updatedMessage;
        let subscriberOrgId;

        Promise.all([
            conversationsTable.getConversationByConversationId(req, conversationId),
            messagesTable.getMessageByConversationIdAndMessageId(req, conversationId, messageId)
        ])
            .then((results) => {
                const conversation = results[0];
                message = results[1];

                if ((!conversation) || (!message)) {
                    throw new ConversationNotExistError(conversationId);
                }
                if (conversation.active === false) {
                    throw new NotActiveError(conversationId);
                }
                if (message.createdBy !== userId) {
                    throw new NoPermissionsError(messageId);
                }

                subscriberOrgId = conversation.subscriberOrgId;

                return conversationsTable.incrementConversationByteCount(req, conversationId, byteCount - message.byteCount);
            })
            .then(() => messagesTable.updateMessageContent(req, message, content, byteCount))
            .then((updatedMessageFromDb) => {
                updatedMessage = updatedMessageFromDb;
                updateCachedByteCount(req, subscriberOrgId, byteCount - message.byteCount);
            })
            .then(() => {
                resolve(updatedMessage);
                messageUpdated(req, updatedMessage);
            })
            .then(() => {
                messagesCache.incrementByteCount(req, byteCount - message.byteCount, conversationId);
            })
            .catch(err => reject(err));
    });
};

export const deleteMessage = (req, conversationId, messageId, userId) => {
    return new Promise((resolve, reject) => {
        let message;
        let updatedMessage;
        let subscriberOrgId;

        Promise.all([
            conversationsTable.getConversationByConversationId(req, conversationId),
            messagesTable.getMessageByConversationIdAndMessageId(req, conversationId, messageId)
        ])
            .then((results) => {
                const conversation = results[0];
                message = results[1];

                if ((!conversation) || (!message)) {
                    throw new ConversationNotExistError(conversationId);
                }
                if (conversation.active === false) {
                    throw new NotActiveError(conversationId);
                }
                if (message.createdBy !== userId) {
                    throw new NoPermissionsError(messageId);
                }

                subscriberOrgId = conversation.subscriberOrgId;
            })
            .then(() => conversationsTable.incrementConversationByteCount(req, conversationId, -message.byteCount))
            .then(() => messagesTable.deleteMessage(req, conversationId, messageId))
            .then((updatedMessageFromDb) => {
                updatedMessage = updatedMessageFromDb;
                return updateCachedByteCount(req, subscriberOrgId, -message.byteCount);
            })
            .then(() => {
                resolve(updatedMessage);
                messageDeleted(req, updatedMessage);
            })
            .then(() => {
                messagesCache.incrementByteCount(req, -message.byteCount, conversationId);
            })
            .catch(err => reject(err));
    });
};

export const likeMessage = (req, conversationId, messageId, userId, like = true) => {
    return new Promise((resolve, reject) => {
        messagesTable.getMessageByConversationIdAndMessageId(req, conversationId, messageId)
            .then((message) => {
                if (!message) {
                    throw new MessageNotExistError(messageId);
                }
                return userMessageTable.getUserMessageByUserIdAndMessageId(req, userId, messageId);
            })
            .then((userMessage) => {
                if (userMessage) {
                    if (userMessage.like !== like) {
                        return userMessageTable.likeMessage(req, userId, messageId, like);
                    }
                    return undefined;
                }
                return userMessageTable.createUserMessage(req, userId, messageId, conversationId, { like });
            })
            .then((result) => {
                if (result) {
                    return messagesTable.updateMessageLikes(req, conversationId, messageId, userId, like);
                }
                return undefined;
            })
            .then(() => {
                resolve();
                messageLiked(req, conversationId, messageId, like);
            })
            .catch(err => reject(err));
    });
};

export const dislikeMessage = (req, conversationId, messageId, userId, dislike = true) => {
    return new Promise((resolve, reject) => {
        messagesTable.getMessageByConversationIdAndMessageId(req, conversationId, messageId)
            .then((message) => {
                if (!message) {
                    throw new MessageNotExistError(messageId);
                }
                return userMessageTable.getUserMessageByUserIdAndMessageId(req, userId, messageId);
            })
            .then((userMessage) => {
                if (userMessage) {
                    if (userMessage.dislike !== dislike) {
                        return userMessageTable.dislikeMessage(req, userId, messageId, dislike);
                    }
                    return undefined;
                }
                return userMessageTable.createUserMessage(req, userId, messageId, conversationId, { dislike });
            })
            .then((result) => {
                if (result) {
                    return messagesTable.updateMessageDislikes(req, conversationId, messageId, userId, dislike);
                }
                return undefined;
            })
            .then(() => {
                resolve();
                messageDisliked(req, conversationId, messageId, dislike);
            })
            .catch(err => reject(err));
    });
};


export const flagMessage = (req, conversationId, messageId, userId, flag = true) => {
    return new Promise((resolve, reject) => {
        messagesTable.getMessageByConversationIdAndMessageId(req, conversationId, messageId)
            .then((message) => {
                if (!message) {
                    throw new MessageNotExistError(messageId);
                }
                return userMessageTable.getUserMessageByUserIdAndMessageId(req, userId, messageId);
            })
            .then((userMessage) => {
                if (userMessage) {
                    if (userMessage.flag !== flag) {
                        return userMessageTable.flagMessage(req, userId, messageId, flag);
                    }
                    return undefined;
                }
                return userMessageTable.createUserMessage(req, userId, messageId, conversationId, { flag });
            })
            .then((result) => {
                if (result) {
                    return messagesTable.updateMessageFlags(req, conversationId, messageId, userId, flag);
                }
                return undefined;
            })
            .then(() => {
                resolve();
                messageFlagged(req, conversationId, messageId, flag);
            })
            .catch(err => reject(err));
    });
};
