import _ from 'lodash';

export function privateUser(dbUser) {
   const userId = dbUser.userId;
   const { emailAddress, firstName, lastName, displayName, country, timeZone, icon, enabled, preferences, role, presence } = dbUser.userInfo || dbUser;
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
      role,
      presence,
      // roleMemberships: dbUser.roleMemberships,
      // defaultPage: dbUser.defaultPage,
      userType: dbUser.userType || 'hablaUser'
   };
}

export function publicUser(dbUser) {
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
}

export function publicUsers(dbUsers) {
   return dbUsers.map((dbUser) => {
      return publicUser(dbUser);
   });
}


export function privateSubscriberOrg(dbSubscriberOrg) {
   const subscriberOrgId = dbSubscriberOrg.subscriberOrgId;
   const { name, enabled, preferences } = dbSubscriberOrg.subscriberOrgInfo || dbSubscriberOrg;
   return {
      subscriberOrgId,
      name,
      enabled,
      preferences: _.cloneDeep(preferences)
   };
}

export function publicSubscriberOrg(dbSubscriberOrg) {
   const ret = privateSubscriberOrg(dbSubscriberOrg);
   if ((ret.preferences) && (ret.preferences.private)) {
      delete ret.preferences.private;
   }
   return ret;
}

export function publicSubscriberOrgs(dbSubscriberOrgs) {
   return dbSubscriberOrgs.map((dbSubscriberOrg) => {
      return publicSubscriberOrg(dbSubscriberOrg);
   });
}

export function publicSubscriber(subscriberOrgId, dbUser) {
   return {
      subscriberOrgId,
      user: publicUser(dbUser)
   };
}


export function privateTeam(dbTeam) {
   const teamId = dbTeam.teamId;
   const { subscriberOrgId, name, active, primary, preferences } = dbTeam.teamInfo || dbTeam;
   return {
      teamId,
      subscriberOrgId,
      name,
      active,
      primary,
      preferences: _.cloneDeep(preferences)
   };
}

export function publicTeam(dbTeam) {
   const ret = privateTeam(dbTeam);
   if ((ret.preferences) && (ret.preferences.private)) {
      delete ret.preferences.private;
   }
   return ret;
}

export function publicTeams(dbTeams) {
   return dbTeams.map((dbTeam) => {
      return publicTeam(dbTeam);
   });
}

export function publicTeamMember(teamId, dbUser) {
   return {
      teamId,
      user: publicUser(dbUser)
   };
}


export function privateTeamRoom(dbTeamRoom) {
   const teamRoomId = dbTeamRoom.teamRoomId;
   const { teamId, name, purpose, publish, active, primary, preferences } = dbTeamRoom.teamRoomInfo || dbTeamRoom;
   return {
      teamRoomId,
      teamId,
      name,
      purpose,
      publish,
      active,
      primary,
      preferences: _.cloneDeep(preferences)
   };
}

export function publicTeamRoom(dbTeamRoom) {
   const ret = privateTeamRoom(dbTeamRoom);
   if ((ret.preferences) && (ret.preferences.private)) {
      delete ret.preferences.private;
   }
   return ret;
}

export function publicTeamRooms(dbTeamRooms) {
   return dbTeamRooms.map((dbTeamRoom) => {
      return publicTeamRoom(dbTeamRoom);
   });
}

export function publicTeamRoomMember(teamRoomId, dbUser) {
   return {
      teamRoomId,
      user: publicUser(dbUser)
   };
}


export function publicConversation(dbConversation) {
   const conversationId = dbConversation.conversationId;
   const { teamRoomId } = dbConversation.conversationInfo || dbConversation;
   const participants = (dbConversation.participants) ? publicUsers(dbConversation.participants) : undefined;
   return {
      conversationId,
      teamRoomId,
      participants
   };
}

export function publicConversations(dbConversations) {
   return dbConversations.map((dbConversation) => {
      return publicConversation(dbConversation);
   });
}


export function publicMessage(dbMessage) {
   const messageId = dbMessage.messageId;
   const { conversationId, created, createdBy, messageType, text, replyTo, path, level } = dbMessage.messageInfo || dbMessage;
   return {
      messageId,
      conversationId,
      created,
      createdBy,
      messageType,
      text,
      replyTo,
      path,
      level
   };
}

export function publicMessages(dbMessages) {
   return dbMessages.map((dbMessage) => {
      return publicMessage(dbMessage);
   });
}

export function publicIntegration(integration) {
   const clone = _.cloneDeep(integration);
   if (clone.box) {
      delete clone.box.accessToken;
      delete clone.box.refreshToken;
   }
   if (clone.google) {
      delete clone.google.access_token;
      delete clone.box.refresh_token;
      delete clone.box.id_token;
      delete clone.box.token_type;
   }
   return clone;
}

export function publicIntegrations(integrations) {
   return integrations.map(integration => publicIntegration(integration));
}
