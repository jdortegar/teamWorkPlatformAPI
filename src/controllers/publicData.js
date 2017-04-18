export function publicUser(dbUser) {
   const userId = dbUser.userId;
   const { firstName, lastName, displayName, icon } = dbUser.userInfo;
   return {
      userId,
      firstName,
      lastName,
      displayName,
      icon,
      userType: 'hablaUser'
      // userType: dbUser.userType || 'hablaUser'
   };
}

export function publicUsers(dbUsers) {
   return dbUsers.map((dbUser) => {
      return publicUser(dbUser);
   });
}


export function publicSubscriberOrg(dbSubscriberOrg) {
   const subscriberOrgId = dbSubscriberOrg.subscriberOrgId;
   const { name } = dbSubscriberOrg.subscriberOrgInfo;
   return {
      subscriberOrgId,
      name
   };
}

export function publicSubscriberOrgs(dbSubscriberOrgs) {
   return dbSubscriberOrgs.map((dbSubscriberOrg) => {
      return publicSubscriberOrg(dbSubscriberOrg);
   });
}


export function publicTeam(dbTeam) {
   const teamId = dbTeam.teamId;
   const { name, subscriberOrgId } = dbTeam.teamInfo;
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
   const { teamId, name, purpose, publish, active } = dbTeamRoom.teamRoomInfo;
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
   const { teamRoomId } = dbConversation.conversationInfo;
   return {
      conversationId,
      teamRoomId
   };
}

export function publicConversations(dbConversations) {
   return dbConversations.map((dbConversation) => {
      return publicConversation(dbConversation);
   });
}


export function publicMessage(dbMessage) {
   const messageId = dbMessage.messageId;
   const { created, createdBy, messageType, text, replyTo } = dbMessage.messageInfo;
   return {
      messageId,
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
