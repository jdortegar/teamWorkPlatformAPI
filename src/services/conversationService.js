import moment from 'moment';
import uuid from 'uuid';
import config from '../config/env';
import { conversationCreated, messageCreated } from './messaging';
import teamRoomSvc from './teamRoomService';
import { ConversationNotExistError, NoPermissionsError } from './errors';
import {
   createItem,
   getConversationParticipantsByConversationId,
   getConversationParticipantsByUserId,
   getConversationsByIds,
   getMessagesByConversationId,
   getMessageById,
   getUsersByIds
} from './queries';

function createMessageInDb(req, partitionId, messageId, message) {
   const docClient = new req.app.locals.AWS.DynamoDB.DocumentClient();
   const tableName = `${config.tablePrefix}messages`;

   const params = {
      TableName: tableName,
      Item: {
         partitionId,
         messageId,
         messageInfo: message
      }
   };

   return docClient.put(params).promise();
}

const MESSAGE_PATH_SEPARATOR = '##';

class ConversationService {

   _convertParticipantsToUsers(req, conversationParticipantsUserIds) {
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
   }

   /**
    * Retrieve all conversations that the specified user is privy to.
    * If the optional 'teamRoomId' is specified, the results are narrowed down to conversations of the team room.
    *
    * @param req
    * @param userId
    * @param teamId
    * @returns {Promise}
    */
   getConversations(req, userId, teamRoomId = undefined) {
      return new Promise((resolve, reject) => {
         let conversations;
         getConversationParticipantsByUserId(req, userId)
            .then((conversationParticipants) => {
               const conversationIds = conversationParticipants.map(conversationParticipant => conversationParticipant.conversationParticipantInfo.conversationId);
               const promises = [getConversationsByIds(req, conversationIds)];
               conversationIds.forEach((conversationId) => {
                  promises.push(getConversationParticipantsByConversationId(req, conversationId));
               });
               return Promise.all(promises);
            })
            .then((conversationsAndParticipants) => {
               const conversationParticipantsUserIds = [];

               let participantsIdx = 0;
               conversations = conversationsAndParticipants[0].filter((conversation) => {
                  participantsIdx += 1;
                  if ((teamRoomId === undefined) || (conversation.conversationInfo.teamRoomId === teamRoomId)) {
                     const participants = conversationsAndParticipants[participantsIdx].map((participant) => {
                        return participant.conversationParticipantInfo.userId;
                     });
                     conversationParticipantsUserIds.push(participants);
                     return true;
                  }
                  return false;
               });

               return this._convertParticipantsToUsers(req, conversationParticipantsUserIds);
            })
            .then((conversationsUsers) => {
               let idx = 0;
               conversations.forEach((conversation) => {
                  conversation.participants = conversationsUsers[idx];
                  idx += 1;
               })
            })
            .then(() => resolve(conversations))
            .catch(err => reject(err));
      });
   }

   createConversationNoCheck(req, teamRoomId, conversationInfo, userId, conversationId = undefined) {
      const actualConversationId = conversationId || uuid.v4();
      req.now = req.now || moment.utc(); // TODO: create middleware.
      const created = req.now.format();
      const conversation = {
         created,
         teamRoomId
      };
      const conversationParticipantId = uuid.v4();

      return new Promise((resolve, reject) => {
         createItem(req, -1, `${config.tablePrefix}conversations`, 'conversationId', actualConversationId, 'conversationInfo', conversation)
            .then(() => {
               const conversationParticipant = {
                  conversationId: actualConversationId,
                  userId
               };
               return createItem(req, -1, `${config.tablePrefix}conversationParticipants`, 'conversationParticipantId', conversationParticipantId, 'conversationParticipantInfo', conversationParticipant);
            })
            .then(() => {
               conversation.conversationId = actualConversationId;
               conversationCreated(req, conversation, userId);

               resolve(conversation);
            })
            .catch(err => reject(err));
      });
   }

   sortMessagesArray(messages) {
      const sortedMessages = messages.sort((msg1, msg2) => {
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
      sortedMessages.forEach((message) => {
         if (message.thread) {
            message.thread = this.sortMessagesArray(message.thread);
         }
      });
      return sortedMessages;
   }

   flattenMessagesArray(messages) {
      let flattenedMessages = [];
      messages.forEach((message) => {
         flattenedMessages.push(message);
         if (message.thread) {
            flattenedMessages = [...flattenedMessages, this.flattenMessagesArray(message.thread)];
            delete message.thread;
         }
      });
      return flattenedMessages;
   }

   sortMessages(messages) {
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
      const sortedMessages = this.sortMessagesArray(topLevelMessages);

      // Flatten it.
      const flattenedMessages = this.flattenMessagesArray(sortedMessages);

      return flattenedMessages;
   }

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
   getMessages(req, conversationId, userId = undefined) {
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
               return getMessagesByConversationId(req, conversationId);
            })
            .then(messages => this.sortMessages(messages))
            .then(messages => resolve(messages))
            .catch(err => reject(err));
      });
   }

   createMessage(req, conversationId, userId, messageType, text, replyTo) {
      return new Promise((resolve, reject) => {
         const messageId = uuid.v4();
         req.now = req.now || moment.utc(); // TODO: create middleware.
         const created = req.now.format();

         const message = {
            conversationId,
            created,
            createdBy: userId,
            messageType,
            text,
            replyTo
         };
         getConversationParticipantsByConversationId(req, conversationId)
            .then((participants) => {
               if (participants.length === 0) {
                  throw new ConversationNotExistError(conversationId);
               }

               const userIds = participants.map((participant) => participant.conversationParticipantInfo.userId);
               if (userIds.indexOf(userId) < 0) {
                  throw new NoPermissionsError(conversationId);
               }

               if (message.replyTo) {
                  return getMessageById(req, message.replyTo);
               }
               return undefined;
            })
            .then((replyToMessage) => {
               if (replyToMessage) {
                  message.level = ((replyToMessage.level) ? replyToMessage.level : 0) + 1;
                  message.path = (replyToMessage.path) ? replyToMessage.path : '';
                  message.path = `${message.path}${MESSAGE_PATH_SEPARATOR}${messageId}`;
               } else {
                  message.level = 0;
                  message.path = messageId;
               }

               return createMessageInDb(req, -1, messageId, message);
            })
            .then(() => {
               message.messageId = messageId;
               resolve(message);
               messageCreated(req, message);
            })
            .catch(err => reject(err));
      });
   }
}

const conversationService = new ConversationService();
export default conversationService;
