import {
   getConversationParticipantsByUserId,
   getConversationsByIds,
   getMessagesByConversationId
} from './util';
import teamRoomSvc from './teamRoomService';

export class ConversationNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, ConversationNotExistError);
   }
}


class ConversationService {

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
         getConversationParticipantsByUserId(req, userId)
            .then((conversationParticipants) => {
               const conversationIds = conversationParticipants.map(conversationParticipant => conversationParticipant.conversationParticipantInfo.conversationId);
               return getConversationsByIds(req, conversationIds);
            })
            .then((conversations) => {
               if (teamRoomId) {
                  const conversationsOfTeamRoom = conversations.filter(conversation => (conversation.conversationInfo.teamRoomId === teamRoomId));
                  return conversationsOfTeamRoom;
               }
               return conversations;
            })
            .then(conversations => resolve(conversations))
            .catch(err => reject(err));
      });
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
            .then(messages => resolve(messages))
            .catch(err => reject(err));
      });
   }
}

const conversationService = new ConversationService();
export default conversationService;
