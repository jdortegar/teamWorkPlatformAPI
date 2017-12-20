import _ from 'lodash';
import moment from 'moment';
import uuid from 'uuid';
import config from '../config/env';
import * as table from '../repositories/db/conversationParticipantsTable';
import * as messagesCache from '../repositories/cache/messagesCache'; // eslint-disable-line no-unused-vars
import { conversationCreated, conversationUpdated, messageCreated } from './messaging';
import * as teamRoomSvc from './teamRoomService';
import { updateCachedByteCount } from './awsMarketplaceService';
import { ConversationNotExistError, NoPermissionsError, NotActiveError } from './errors';
import {
   createMessageInDb,
   getMessagesByConversationIdFiltered,
   getMessageById
} from '../repositories/messagesRepo';
import { createReadMessages } from '../repositories/db/readMessagesTable';
import {
   getConversationsByIds,
   getConversationsByTeamRoomId,
   createItem,
   getUsersByIds,
   updateItem
} from '../repositories/util';

const MESSAGE_PATH_SEPARATOR = '##';


const convertParticipantsToUsers = (req, conversationParticipantsUserIds) => {
   const userIds = new Set();
   conversationParticipantsUserIds.forEach((participants) => {
      participants.forEach(userId => userIds.add(userId));
   });

   return new Promise((resolve, reject) => {
      getUsersByIds(req, Array.from(userIds))
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

/**
 * Retrieve all conversations that the specified user is privy to.
 * If the optional 'teamRoomId' is specified, the results are narrowed down to conversations of the team room.
 *
 * @param req
 * @param userId
 * @param teamId
 * @returns {Promise}
 */
export const getConversations = (req, userId, teamRoomId = undefined) => {
   return new Promise((resolve, reject) => {
      let conversations;
      table.getConversationParticipantsByUserId(req, userId)
         .then((conversationParticipants) => {
            const conversationIds = conversationParticipants.reduce((prevValue, conversationParticipant) => {
               if (teamRoomId) {
                  if (conversationParticipant.teamRoomId === teamRoomId) {
                     prevValue.push(conversationParticipant.conversationId);
                  }
               } else {
                  prevValue.push(conversationParticipant.conversationId);
               }
               return prevValue;
            }, []);

            return getConversationsByIds(req, conversationIds);
         })
         .then((retrievedConversations) => {
            conversations = retrievedConversations;

            const promises = [];
            conversations.forEach((conversation) => {
               promises.push(table.getConversationParticipantsByConversationId(req, conversation.conversationId));
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
         .catch(err => reject(err));
   });
};

export const createConversationNoCheck = (req, teamRoomId, conversationInfo, userId, conversationParticipantUserIds, conversationId = undefined) => {
   const actualConversationId = conversationId || uuid.v4();
   const conversation = {
      teamRoomId,
      active: true,
      created: req.now.format(),
      lastModified: req.now.format()
   };

   return new Promise((resolve, reject) => {
      createItem(req, -1, `${config.tablePrefix}conversations`, 'conversationId', actualConversationId, 'conversationInfo', conversation)
         .then(() => table.createConversationParticipant(req, actualConversationId, userId, teamRoomId))
         .then(() => getUsersByIds(req, [userId]))
         .then((dbUsers) => {
            const { userInfo: participant } = dbUsers[0];
            participant.userId = userId;
            conversation.participants = [participant];
            conversation.conversationId = actualConversationId;

            return createReadMessages(req, userId, actualConversationId);
         })
         .then(() => {
            conversationCreated(req, conversation, conversationParticipantUserIds);
            resolve(conversation);
         })
         .catch(err => reject(err));
   });
};

export const setConversationsOfTeamRoomActive = (req, teamRoomId, active) => {
   return new Promise((resolve, reject) => {
      const conversations = [];
      getConversationsByTeamRoomId(req, teamRoomId)
         .then((dbConversations) => {
            const updateConversations = [];
            dbConversations.forEach((dbConversation) => {
               const { conversationInfo } = dbConversation;
               conversationInfo.active = active;
               updateConversations.push(
                  updateItem(
                     req,
                     -1,
                     `${config.tablePrefix}conversations`,
                     'conversationId',
                     dbConversation.conversationId,
                     { conversationInfo: { active } }
                  )
               );
               conversations.push(_.merge({ conversationId: dbConversation.conversationId }, conversationInfo));
            });
            return Promise.all(updateConversations);
         })
         .then(() => {
            // TODO: Reconfigure socket.io channels.
         })
         .then(() => {
            resolve();

            conversations.forEach((conversation) => {
               conversationUpdated(req, conversation);
            });
         })
         .catch(err => reject(err));
   });
};

export const addUserToConversationByTeamRoomId = (req, user, teamRoomId) => {
   return new Promise((resolve, reject) => {
      let conversationId;
      getConversationsByTeamRoomId(req, teamRoomId)
         .then((conversations) => {
            if (conversations.length > 0) {
               conversationId = conversations[0].conversationId;
               return table.createConversationParticipant(req, conversationId, user.userId, teamRoomId);
            }
            return undefined;
         })
         .then(() => createReadMessages(req, user.userId, conversationId))
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

const sortMessagesArray = (messages) => {
   let sortedMessages = messages.sort((msg1, msg2) => {
      const epoch1 = moment(msg1.messageInfo.created).unix();
      const epoch2 = moment(msg2.messageInfo.created).unix();
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
         flattenedMessages = [...flattenedMessages, flattenMessagesArray(message.thread)];
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
      getConversationsByIds(req, [conversationId])
         .then((conversations) => {
            if (conversations.length !== 1) {
               throw new ConversationNotExistError(conversationId);
            }

            const conversation = conversations[0];
            if (userId) {
               const teamRoomId = conversation.conversationInfo.teamRoomId;
               return teamRoomSvc.getTeamRoomUsers(req, teamRoomId, userId);
            }
            return undefined;
         })
         .then(() => {
            return getMessagesByConversationIdFiltered(req, conversationId, { since, until, minLevel, maxLevel });
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

const getSubscriberOrgIdByConversationId = (req, conversationId) => {
   return new Promise((resolve, reject) => {
      req.app.locals.redis.getAsync(`${config.redisPrefix}${conversationId}#subscriberOrgId`)
         .then((cachedSubscriberOrgId) => {
            let subscriberOrgId = cachedSubscriberOrgId;
            if ((!subscriberOrgId) || (subscriberOrgId === null)) {
               // TODO: wait until schema change.
               // TODO: get from DB and set cache.
               subscriberOrgId = undefined;
               req.app.locals.redis.setAsync(`${config.redisPrefix}${conversationId}#subscriberOrgId`, subscriberOrgId);
            }
            return subscriberOrgId;
         })
         .then(subscriberOrgId => resolve(subscriberOrgId))
         .catch(err => reject(err));
   });
};

export const createMessage = (req, conversationId, userId, content, replyTo) => {
   return new Promise((resolve, reject) => {
      const messageId = uuid.v4();

      const byteCount = byteCountOfContent(content);
      const message = {
         conversationId,
         createdBy: userId,
         content,
         replyTo,
         byteCount,
         created: req.now.format(),
         lastModified: req.now.format()
      };
      Promise.all([getConversationsByIds(req, [conversationId]), table.getConversationParticipantsByConversationId(req, conversationId)])
         .then((promiseResults) => {
            const conversations = promiseResults[0];
            const participants = promiseResults[1];

            if ((conversations.length === 0) || (participants.length === 0)) {
               throw new ConversationNotExistError(conversationId);
            }
            const conversation = conversations[0];

            if (('active' in conversation.conversationInfo) && (conversation.conversationInfo.active === false)) {
               throw new NotActiveError(conversationId);
            }

            const userIds = participants.map(participant => participant.userId);
            if (userIds.indexOf(userId) < 0) {
               throw new NoPermissionsError(conversationId);
            }

            if (message.replyTo) {
               return getMessageById(req, message.replyTo);
            }
            return undefined;
         })
         .then((replyToMessages) => {
            if ((replyToMessages) && (replyToMessages.length > 0)) {
               const replyToMessage = replyToMessages[0];
               message.level = ((replyToMessage.messageInfo.level) ? replyToMessage.messageInfo.level : 0) + 1;
               message.path = (replyToMessage.messageInfo.path) ? replyToMessage.messageInfo.path : '';
               message.path = `${message.path}${MESSAGE_PATH_SEPARATOR}${messageId}`;
            } else {
               message.level = 0;
               message.path = messageId;
            }

            return createMessageInDb(req, -1, messageId, message);
         })
         .then(() => getSubscriberOrgIdByConversationId(req, conversationId))
         .then(subscriberOrgId => updateCachedByteCount(req, subscriberOrgId, byteCount))
         .then(() => {
            message.messageId = messageId;
            resolve(message);
            messageCreated(req, message);
         })
         .catch(err => reject(err));
   });
};

