export function privateUser(dbUser) {
   const userId = dbUser.userId;
   const { emailAddress, firstName, lastName, displayName, country, timeZone, icon, preferences } = dbUser.userInfo || dbUser;
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
      preferences,
      roleMemberships: dbUser.roleMemberships,
      defaultPage: dbUser.defaultPage,
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
   const { name, preferences } = dbSubscriberOrg.subscriberOrgInfo || dbSubscriberOrg;
   return {
      subscriberOrgId,
      name,
      preferences
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


export function publicTeam(dbTeam) {
   const teamId = dbTeam.teamId;
   const { name, subscriberOrgId } = dbTeam.teamInfo || dbTeam;
   return {
      teamId,
      subscriberOrgId,
      name
   };
}

export function publicTeams(dbTeams) {
   return dbTeams.map((dbTeam) => {
      return publicTeam(dbTeam);
   });
}


export function publicTeamRoom(dbTeamRoom) {
   const teamRoomId = dbTeamRoom.teamRoomId;
   const { teamId, name, purpose, publish, active } = dbTeamRoom.teamRoomInfo || dbTeamRoom;
   return {
      teamRoomId,
      teamId,
      name,
      purpose,
      publish,
      active
   };
}

export function publicTeamRooms(dbTeamRooms) {
   return dbTeamRooms.map((dbTeamRoom) => {
      return publicTeamRoom(dbTeamRoom);
   });
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
   const { conversationId, created, createdBy, messageType, text, replyTo } = dbMessage.messageInfo || dbMessage;
   return {
      messageId,
      conversationId,
      created,
      createdBy,
      messageType,
      text,
      replyTo
   };
}

export function publicMessages(dbMessages) {
   return dbMessages.map((dbMessage) => {
      return publicMessage(dbMessage);
   });
}
