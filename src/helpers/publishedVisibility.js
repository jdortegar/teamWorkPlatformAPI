import _ from 'lodash';

const privateUser = (user) => {
   const userId = user.userId;
   const {
      emailAddress,
      firstName,
      lastName,
      displayName,
      country,
      timeZone,
      icon,
      defaultLocale,
      presenceStatus,
      bookmarks,
      enabled,
      preferences,
      created,
      lastModified,
      role,
      subscriberUserId,
      teamMemberId,
      teamRoomMemberId,
      presence
   } = user;
   return {
      userId,
      username: emailAddress,
      email: emailAddress,
      firstName,
      lastName,
      displayName,
      country,
      timeZone,
      icon,
      defaultLocale,
      presenceStatus,
      bookmarks,
      enabled,
      preferences: _.cloneDeep(preferences),
      created,
      lastModified,
      role,
      subscriberUserId,
      teamMemberId,
      teamRoomMemberId,
      presence,
      // roleMemberships: dbUser.roleMemberships,
      // defaultPage: dbUser.defaultPage,
      userType: user.userType || 'hablaUser'
   };
};

const publicUser = (user) => {
   const ret = privateUser(user);
   delete ret.username;
   delete ret.email;
   if ((ret.preferences) && (ret.preferences.private)) {
      delete ret.preferences.private;
   }
   delete ret.roleMemberships;
   delete ret.defaultPage;
   delete ret.userType;
   return ret;
};

const publicUsers = (users) => {
   return users.map((user) => {
      return publicUser(user);
   });
};


const publicInvitation = (invitation) => {
   // Use inviteeEmail only if a subscriberOrg invite.
   const inviteeEmail = (invitation.teamId) ? undefined : invitation.inviteeEmail;

   const {
      inviterUserId,
      created,
      inviterFirstName,
      inviterLastName,
      inviterDisplayName,
      inviteeUserId,
      expires,
      state,
      lastModified,
      subscriberOrgId,
      subscriberOrgName,
      teamId,
      teamName,
      teamRoomId,
      teamRoomName
   } = invitation;
   return {
      inviterUserId,
      created,
      inviterFirstName,
      inviterLastName,
      inviterDisplayName,
      inviteeEmail,
      inviteeUserId,
      expires,
      state,
      lastModified,
      subscriberOrgId,
      subscriberOrgName,
      teamId,
      teamName,
      teamRoomId,
      teamRoomName
   };
};

const publicInvitations = (invitations) => {
   return invitations.map((invitation) => {
      return publicInvitation(invitation);
   });
};


const privateSubscriberOrg = (subscriberOrg) => {
   const subscriberOrgId = subscriberOrg.subscriberOrgId;
   const { name, icon, enabled, preferences, created, lastModified } = subscriberOrg;
   return {
      subscriberOrgId,
      name,
      icon,
      enabled,
      preferences: _.cloneDeep(preferences),
      created,
      lastModified
   };
};

const publicSubscriberOrg = (subscriberOrg) => {
   const ret = privateSubscriberOrg(subscriberOrg);
   if ((ret.preferences) && (ret.preferences.private)) {
      delete ret.preferences.private;
   }
   return ret;
};

const publicSubscriberOrgs = (subscriberOrgs) => {
   return subscriberOrgs.map((subscriberOrg) => {
      return publicSubscriberOrg(subscriberOrg);
   });
};

const publicSubscriber = (subscriberOrgId, user) => {
   return {
      subscriberOrgId,
      user: publicUser(user)
   };
};


const privateTeam = (team) => {
   const teamId = team.teamId;
   const { subscriberOrgId, name, icon, active, primary, preferences, created, lastModified } = team;
   return {
      teamId,
      subscriberOrgId,
      name,
      icon,
      active,
      primary,
      preferences: _.cloneDeep(preferences),
      created,
      lastModified
   };
};

const publicTeam = (team) => {
   const ret = privateTeam(team);
   if ((ret.preferences) && (ret.preferences.private)) {
      delete ret.preferences.private;
   }
   return ret;
};

const publicTeams = (teams) => {
   return teams.map((team) => {
      return publicTeam(team);
   });
};

const publicTeamMember = (teamId, user) => {
   return {
      teamId,
      user: publicUser(user)
   };
};


const privateTeamRoom = (teamRoom) => {
   const teamRoomId = teamRoom.teamRoomId;
   const { teamId, name, purpose, icon, active, primary, preferences, created, lastModified } = teamRoom;
   return {
      teamRoomId,
      teamId,
      name,
      purpose,
      icon,
      active,
      primary,
      preferences: _.cloneDeep(preferences),
      created,
      lastModified
   };
};

const publicTeamRoom = (teamRoom) => {
   const ret = privateTeamRoom(teamRoom);
   if ((ret.preferences) && (ret.preferences.private)) {
      delete ret.preferences.private;
   }
   return ret;
};

const publicTeamRooms = (teamRooms) => {
   return teamRooms.map((teamRoom) => {
      return publicTeamRoom(teamRoom);
   });
};

const publicTeamRoomMember = (teamRoomId, user) => {
   return {
      teamRoomId,
      user: publicUser(user)
   };
};


const publicConversation = (conversation) => {
   const conversationId = conversation.conversationId;
   const { topic, teamRoomId, created, lastModified } = conversation;
   const participants = (conversation.participants) ? publicUsers(conversation.participants) : undefined;
   return {
      topic,
      conversationId,
      teamRoomId,
      participants,
      created,
      lastModified
   };
};

const publicConversations = (conversations) => {
   return conversations.map((conversation) => {
      return publicConversation(conversation);
   });
};


const publicMessage = (message) => {
   const messageId = message.messageId;
   const { conversationId, createdBy, topic, content, replyTo, path, level, created, lastModified, deleted } = message.messageInfo || message;
   return {
      messageId,
      conversationId,
      createdBy,
      topic,
      content,
      replyTo,
      path,
      level,
      created,
      lastModified,
      deleted
   };
};

const publicMessages = (messages) => {
   return messages.map((message) => {
      return publicMessage(message);
   });
};

const publicMessageLike = (messageLike) => {
   const { conversationId, messageId, like } = messageLike;
   return {
      conversationId,
      messageId,
      like
   };
};

const publicMessageDislike = (messageDislike) => {
   const { conversationId, messageId, dislike } = messageDislike;
   return {
      conversationId,
      messageId,
      dislike
   };
};

const publicMessageFlag = (messageFlag) => {
   const { conversationId, messageId, flag } = messageFlag;
   return {
      conversationId,
      messageId,
      flag
   };
};

const publicReadMessages = (readMessages) => {
   const ret = _.cloneDeep(readMessages);
   if (ret.conversationIds) {
      Object.keys(ret.conversationIds).forEach((conversationId) => {
         delete ret.conversationIds[conversationId].byteCount;
      });
   }
   return ret;
};

const publicIntegration = (integration) => {
   const clone = _.cloneDeep(integration);
   const integrations = (clone.integrations) ? clone.integrations : clone;
   if (integrations.box) {
      delete integrations.box.accessToken;
      delete integrations.box.refreshToken;
   }
   if (integrations.google) {
      delete integrations.google.access_token;
      delete integrations.google.refresh_token;
      delete integrations.google.id_token;
      delete integrations.google.token_type;
   }
   if (integrations.sharepoint) {
      delete integrations.sharepoint.token_type;
      delete integrations.sharepoint.resource;
      delete integrations.sharepoint.access_token;
      delete integrations.sharepoint.refresh_token;
      delete integrations.sharepoint.realm;
   }
   return clone;
};

const publicIntegrations = (integrations) => {
   return integrations.map(integration => publicIntegration(integration));
};


// Index in the array is the version number to publish against.
export const apiVersionedVisibility = {
   privateUser: {
      latest: privateUser
   },
   publicUser: {
      latest: publicUser
   },
   publicUsers: {
      latest: publicUsers
   },
   publicInvitation: {
      latest: publicInvitation
   },
   publicInvitations: {
      latest: publicInvitations
   },
   privateSubscriberOrg: {
      latest: privateSubscriberOrg
   },
   publicSubscriberOrg: {
      latest: publicSubscriberOrg
   },
   publicSubscriberOrgs: {
      latest: publicSubscriberOrgs
   },
   publicSubscriber: {
      latest: publicSubscriber
   },
   privateTeam: {
      latest: privateTeam
   },
   publicTeam: {
      latest: publicTeam
   },
   publicTeams: {
      latest: publicTeams
   },
   publicTeamMember: {
      latest: publicTeamMember
   },
   privateTeamRoom: {
      latest: privateTeamRoom
   },
   publicTeamRoom: {
      latest: publicTeamRoom
   },
   publicTeamRooms: {
      latest: publicTeamRooms
   },
   publicTeamRoomMember: {
      latest: publicTeamRoomMember
   },
   publicConversation: {
      latest: publicConversation
   },
   publicConversations: {
      latest: publicConversations
   },
   publicMessage: {
      latest: publicMessage
   },
   publicMessages: {
      latest: publicMessages
   },
   publicMessageLike: {
      latest: publicMessageLike
   },
   publicMessageDislike: {
      latest: publicMessageDislike
   },
   publicMessageFlag: {
      latest: publicMessageFlag
   },
   publicReadMessages: {
      latest: publicReadMessages
   },
   publicIntegration: {
      latest: publicIntegration
   },
   publicIntegrations: {
      latest: publicIntegrations
   }
};

export const publishByApiVersion = (req, publishers, ...args) => {
   // Always the latest for publishing.  This implies backwards compatability for publishing.
   return publishers.latest(...args);
   // return publishers[req.apiVersion.toString()](...args);
};

