import _ from 'lodash';

const privateUser = (dbUser) => {
   const userId = dbUser.userId;
   const {
      emailAddress,
      firstName,
      lastName,
      displayName,
      country,
      timeZone,
      icon,
      enabled,
      preferences,
      created,
      lastModified,
      role,
      subscriberUserId,
      teamMemberId,
      teamRoomMemberId,
      presence
   } = dbUser.userInfo || dbUser;
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
      userType: dbUser.userType || 'hablaUser'
   };
};

const publicUser = (dbUser) => {
   const ret = privateUser(dbUser);
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

const publicUsers = (dbUsers) => {
   return dbUsers.map((dbUser) => {
      return publicUser(dbUser);
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


const privateSubscriberOrg = (dbSubscriberOrg) => {
   const subscriberOrgId = dbSubscriberOrg.subscriberOrgId;
   const { name, icon, enabled, preferences, created, lastModified } = dbSubscriberOrg.subscriberOrgInfo || dbSubscriberOrg;
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

const publicSubscriberOrg = (dbSubscriberOrg) => {
   const ret = privateSubscriberOrg(dbSubscriberOrg);
   if ((ret.preferences) && (ret.preferences.private)) {
      delete ret.preferences.private;
   }
   return ret;
};

const publicSubscriberOrgs = (dbSubscriberOrgs) => {
   return dbSubscriberOrgs.map((dbSubscriberOrg) => {
      return publicSubscriberOrg(dbSubscriberOrg);
   });
};

const publicSubscriber = (subscriberOrgId, dbUser) => {
   return {
      subscriberOrgId,
      user: publicUser(dbUser)
   };
};


const privateTeam = (dbTeam) => {
   const teamId = dbTeam.teamId;
   const { subscriberOrgId, name, icon, active, primary, preferences, created, lastModified } = dbTeam.teamInfo || dbTeam;
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

const publicTeam = (dbTeam) => {
   const ret = privateTeam(dbTeam);
   if ((ret.preferences) && (ret.preferences.private)) {
      delete ret.preferences.private;
   }
   return ret;
};

const publicTeams = (dbTeams) => {
   return dbTeams.map((dbTeam) => {
      return publicTeam(dbTeam);
   });
};

const publicTeamMember = (teamId, dbUser) => {
   return {
      teamId,
      user: publicUser(dbUser)
   };
};


const privateTeamRoom = (dbTeamRoom) => {
   const teamRoomId = dbTeamRoom.teamRoomId;
   const { teamId, name, purpose, publish, icon, active, primary, preferences, created, lastModified } = dbTeamRoom.teamRoomInfo || dbTeamRoom;
   return {
      teamRoomId,
      teamId,
      name,
      purpose,
      publish,
      icon,
      active,
      primary,
      preferences: _.cloneDeep(preferences),
      created,
      lastModified
   };
};

const publicTeamRoom = (dbTeamRoom) => {
   const ret = privateTeamRoom(dbTeamRoom);
   if ((ret.preferences) && (ret.preferences.private)) {
      delete ret.preferences.private;
   }
   return ret;
};

const publicTeamRooms = (dbTeamRooms) => {
   return dbTeamRooms.map((dbTeamRoom) => {
      return publicTeamRoom(dbTeamRoom);
   });
};

const publicTeamRoomMember = (teamRoomId, dbUser) => {
   return {
      teamRoomId,
      user: publicUser(dbUser)
   };
};


const publicConversation = (dbConversation) => {
   const conversationId = dbConversation.conversationId;
   const { teamRoomId, created, lastModified } = dbConversation.conversationInfo || dbConversation;
   const participants = (dbConversation.participants) ? publicUsers(dbConversation.participants) : undefined;
   return {
      conversationId,
      teamRoomId,
      participants,
      created,
      lastModified
   };
};

const publicConversations = (dbConversations) => {
   return dbConversations.map((dbConversation) => {
      return publicConversation(dbConversation);
   });
};


const publicMessage = (dbMessage) => {
   const messageId = dbMessage.messageId;
   const { conversationId, createdBy, content, replyTo, path, level, created, lastModified } = dbMessage.messageInfo || dbMessage;
   const messageType = 'text';
   let text = 'No message text.';
   content.forEach((contentEntry) => {
      if (contentEntry.type === 'text/plain') {
         text = contentEntry.text;
      }
   });
   return {
      messageId,
      conversationId,
      createdBy,
      messageType, // TODO: deprecated in v1
      text, // TODO: deprecated in v1
      content,
      replyTo,
      path,
      level,
      created,
      lastModified
   };
};

const publicMessages = (dbMessages) => {
   return dbMessages.map((dbMessage) => {
      return publicMessage(dbMessage);
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
   if (clone.box) {
      delete clone.box.accessToken;
      delete clone.box.refreshToken;
   }
   if (clone.google) {
      delete clone.google.access_token;
      delete clone.google.refresh_token;
      delete clone.google.id_token;
      delete clone.google.token_type;
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

