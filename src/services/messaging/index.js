import _ from 'lodash';
import { apiVersionedVisibility, publishByApiVersion } from '../../helpers/publishedVisibility';
import * as internalQueue from './internalQueue';
import { _broadcastEvent, _joinChannels, ChannelFactory, EventTypes } from './messagingService';
import Roles from '../roles';

// EventType = user

export const userCreated = (req, user) => {
   return _broadcastEvent(req, EventTypes.userCreated, publishByApiVersion(req, apiVersionedVisibility.publicUser, user), [
      ChannelFactory.publicChannel()
   ]);
};

export const userUpdated = (req, user) => {
   // TODO: should only be broadcast to subscribersOrgs of the user.
   return _broadcastEvent(req, EventTypes.userUpdated, publishByApiVersion(req, apiVersionedVisibility.publicUser, user), [
      ChannelFactory.publicChannel()
   ]);
};

export const userPrivateInfoUpdated = (req, user) => {
   return _broadcastEvent(req, EventTypes.userPrivateInfoUpdated, publishByApiVersion(req, apiVersionedVisibility.privateUser, user), [
      ChannelFactory.personalChannel(user.userId)
   ]);
};

export const userBookmarksUpdated = (req, user, bookmarks) => {
   const publishedBookmarks = _.cloneDeep(bookmarks);
   const messages = {};
   Object.keys(publishedBookmarks.messages).forEach((messageId) => {
      messages[messageId] = publishByApiVersion(req, apiVersionedVisibility.publicMessage, publishedBookmarks.messages[messageId]);
   });
   publishedBookmarks.messages = messages;

   return _broadcastEvent(req, EventTypes.userBookmarksUpdated, publishedBookmarks, [
      ChannelFactory.personalChannel(user.userId)
   ]);
};

export const userInvited = (req, userId, invitation) => {
   return _broadcastEvent(req, EventTypes.userInvited, invitation, [
      ChannelFactory.personalChannel(userId)
   ]);
};

export const userInvitationAccepted = (req, invitation, toEmailOrUserId) => {
   const event = _.merge({}, invitation, { inviteeUserIdOrEmail: toEmailOrUserId });
   return _broadcastEvent(req, EventTypes.userInvitationAccepted, event, [
      ChannelFactory.personalChannel(invitation.byUserId)
   ]);
};

export const userInvitationDeclined = (req, invitation, toEmailOrUserId) => {
   const event = _.merge({}, invitation, { inviteeUserIdOrEmail: toEmailOrUserId });
   return _broadcastEvent(req, EventTypes.userInvitationDeclined, event, [
      ChannelFactory.personalChannel(invitation.byUserId)
   ]);
};

export const sentInvitationStatus = (req, sentInvitation) => {
   return _broadcastEvent(req, EventTypes.sentInvitationStatus, publishByApiVersion(req, apiVersionedVisibility.publicInvitation, sentInvitation), [
      ChannelFactory.personalChannel(sentInvitation.inviterUserId)
   ]);
};


// EventType = subscriberOrg

export const subscriberOrgCreated = (req, subscriberOrg, userId) => {
   _joinChannels(req, userId, [
      ChannelFactory.subscriberOrgChannel(subscriberOrg.subscriberOrgId),
      ChannelFactory.subscriberOrgAdminChannel(subscriberOrg.subscriberOrgId)
   ])
      .then(() => {
         // Only the person who created this gets to know, as she's the only person in that org.
         return _broadcastEvent(req, EventTypes.subscriberOrgCreated, publishByApiVersion(req, apiVersionedVisibility.publicSubscriberOrg, subscriberOrg), [
            ChannelFactory.personalChannel(userId)
         ]);
      })
      .catch((err) => {
         req.logger.error({ err }, `Failed to join channels for subscriberOrgId=${subscriberOrg.subscriberOrgId}`);
      });
};

export const subscriberOrgUpdated = (req, subscriberOrg) => {
   return _broadcastEvent(req, EventTypes.subscriberOrgUpdated, publishByApiVersion(req, apiVersionedVisibility.publicSubscriberOrg, subscriberOrg), [
      ChannelFactory.subscriberOrgChannel(subscriberOrg.subscriberOrgId)
   ]);
};

export const subscriberOrgPrivateInfoUpdated = (req, subscriberOrg) => {
   return _broadcastEvent(req, EventTypes.userPrivateInfoUpdated, publishByApiVersion(req, apiVersionedVisibility.privateSubscriberOrg, subscriberOrg), [
      ChannelFactory.subscriberOrgAdminChannel(subscriberOrg.subscriberOrgId)
   ]);
};

export const subscriberAdded = (req, subscriberOrgId, user, role, subscriberUserId) => {
   const subscriberOrgChannel = ChannelFactory.subscriberOrgChannel(subscriberOrgId);
   const channels = [ChannelFactory.subscriberOrgChannel(subscriberOrgId)];
   if (role === Roles.admin) {
      channels.push(ChannelFactory.subscriberOrgAdminChannel(subscriberOrgId));
   }

   return _joinChannels(req, user.userId, channels)
      .then(() => {
         const mergedUser = _.merge(user, { userId: user.userId, role, subscriberUserId });
         _broadcastEvent(req, EventTypes.subscriberAdded, publishByApiVersion(req, apiVersionedVisibility.publicSubscriber, subscriberOrgId, mergedUser), [subscriberOrgChannel]);
      })
      .catch(err => req.logger.error({ err }));
};


// EventType = team

export const teamCreated = (req, team, teamAdminUserIds) => { // Assume 1. a new team has 1 member.  Assume 2. org admins containing team are also part of that team.
   const joinChannelPromises = [];
   teamAdminUserIds.forEach((teamAdminUserId) => {
      joinChannelPromises.push(_joinChannels(req, teamAdminUserId, [
         ChannelFactory.teamChannel(team.teamId),
         ChannelFactory.teamAdminChannel(team.teamId)
      ]));
   });

   return Promise.all(joinChannelPromises)
      .then(() => {
         return _broadcastEvent(req, EventTypes.teamCreated, publishByApiVersion(req, apiVersionedVisibility.publicTeam, team), [
            ChannelFactory.teamChannel(team.teamId)
         ]);
      });
};

export const teamUpdated = (req, team) => {
   return _broadcastEvent(req, EventTypes.teamUpdated, publishByApiVersion(req, apiVersionedVisibility.publicTeam, team), [
      ChannelFactory.teamChannel(team.teamId)
   ]);
};

export const teamPrivateInfoUpdated = (req, team) => {
   return _broadcastEvent(req, EventTypes.teamPrivateInfoUpdated, publishByApiVersion(req, apiVersionedVisibility.privateTeam, team), [
      ChannelFactory.teamAdminChannel(team.teamId)
   ]);
};

export const teamMemberAdded = (req, team, user, role, teamMemberId) => {
   const { teamId } = team;
   const teamChannel = ChannelFactory.teamChannel(teamId);
   const channels = [teamChannel];
   if (role === Roles.admin) {
      channels.push(ChannelFactory.teamAdminChannel(teamId));
   }

   return _joinChannels(req, user.userId, channels)
      .then(() => {
         return _broadcastEvent(req, EventTypes.teamCreated, publishByApiVersion(req, apiVersionedVisibility.publicTeam, team), [
            ChannelFactory.personalChannel(user.userId)
         ]);
      })
      .then(() => {
         const mergedUser = _.merge(user, { userId: user.userId, role, teamMemberId });
         _broadcastEvent(req, EventTypes.teamMemberAdded, publishByApiVersion(req, apiVersionedVisibility.publicTeamMember, teamId, mergedUser), [teamChannel]);
      })
      .catch(err => req.logger.error({ err }));
};

// EventType = conversation

export const conversationCreated = (req, conversation, conversationParticipantUserIds) => {
   const joinChannelPromises = [];
   conversationParticipantUserIds.forEach((conversationParticipantUserId) => {
      _joinChannels(req, conversationParticipantUserId, [
         ChannelFactory.conversationChannel(conversation.conversationId)
      ]);
   });

   return Promise.all(joinChannelPromises)
      .then(() => {
         return _broadcastEvent(req, EventTypes.conversationCreated, publishByApiVersion(req, apiVersionedVisibility.publicConversation, conversation), [
            ChannelFactory.conversationChannel(conversation.teamId)
         ]);
      });
};

export const conversationUpdated = (req, conversation) => {
   return _broadcastEvent(req, EventTypes.conversationUpdated, publishByApiVersion(req, apiVersionedVisibility.publicConversation, conversation), [
      ChannelFactory.conversationChannel(conversation.conversationId)
   ]);
};


// EventType = message

export const messageCreated = (req, message) => {
   return _broadcastEvent(req, EventTypes.messageCreated, publishByApiVersion(req, apiVersionedVisibility.publicMessage, message), [
      ChannelFactory.conversationChannel(message.conversationId)
   ]);
};

export const messageRead = (req, readMessages, userId = undefined) => {
   const channels = (userId) ?
      [ChannelFactory.personalChannel(userId)] :
      Object.keys(readMessages.conversationIds).map(conversationId => ChannelFactory.conversationChannel(conversationId));
   return _broadcastEvent(req, EventTypes.messageRead, publishByApiVersion(req, apiVersionedVisibility.publicReadMessages, readMessages), channels);
};

export const messageUpdated = (req, message) => {
   return _broadcastEvent(req, EventTypes.messageUpdated, publishByApiVersion(req, apiVersionedVisibility.publicMessage, message), [
      ChannelFactory.conversationChannel(message.conversationId)
   ]);
};

export const messageLiked = (req, conversationId, messageId, like) => {
   const payload = {
      conversationId,
      messageId,
      like
   };
   return _broadcastEvent(req, EventTypes.messageLiked, publishByApiVersion(req, apiVersionedVisibility.publicMessageLike, payload), [
      ChannelFactory.conversationChannel(conversationId)
   ]);
};

export const messageDisliked = (req, conversationId, messageId, dislike) => {
   const payload = {
      conversationId,
      messageId,
      dislike
   };
   return _broadcastEvent(req, EventTypes.messageDisliked, publishByApiVersion(req, apiVersionedVisibility.publicMessageDislike, payload), [
      ChannelFactory.conversationChannel(conversationId)
   ]);
};

export const messageFlagged = (req, conversationId, messageId, flag) => {
   const payload = {
      conversationId,
      messageId,
      flag
   };
   return _broadcastEvent(req, EventTypes.messageFlagged, publishByApiVersion(req, apiVersionedVisibility.publicMessageFlag, payload), [
      ChannelFactory.conversationChannel(conversationId)
   ]);
};

export const messageDeleted = (req, message) => {
   return _broadcastEvent(req, EventTypes.messageDeleted, publishByApiVersion(req, apiVersionedVisibility.publicMessage, message), [
      ChannelFactory.conversationChannel(message.conversationId)
   ]);
};


// EventType = integration

export const integrationsUpdated = (req, subscriberUser) => {
   // Send to internal channel.
   const event = _.cloneDeep(subscriberUser);
   delete event.role;
   internalQueue.sendEvent(req, EventTypes.integrationsUpdated, event);

   return _broadcastEvent(req, EventTypes.integrationsUpdated, publishByApiVersion(req, apiVersionedVisibility.publicIntegration, subscriberUser), [
      ChannelFactory.personalChannel(subscriberUser.userId)
   ]);
};

export const boxWebhookEvent = (req, body) => {
   // Send to internal channel.
   internalQueue.sendEvent(req, EventTypes.boxWebhookEvent, body);
};

export const googleWebhookEvent = (req, body) => {
   // Send to internal channel.
   internalQueue.sendEvent(req, EventTypes.googleWebhookEvent, body);
};

export const sharepointWebhookEvent = (req, body) => {
   // Send to internal channel.
   internalQueue.sendEvent(req, EventTypes.sharepointWebhookEvent, body);
};
