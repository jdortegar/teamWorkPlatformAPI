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

export function publicTeam(dbTeam) {
   const teamId = dbTeam.teamId;
   const { name } = dbTeam.teamInfo;
   return {
      teamId,
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
   const { name, purpose, publish, active } = dbTeamRoom.teamRoomInfo;
   return {
      teamRoomId,
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
   const { userIds } = dbConversation.conversationInfo;
   return {
      conversationId,
      participants: userIds
   };
}

export function publicConversations(dbConversations) {
   return dbConversations.map((dbConversation) => {
      return publicConversation(dbConversation);
   });
}


export function publicMessage(dbMessage) {
   const messageId = dbMessage.messageId;
   const { created, createdBy, messageType, text } = dbMessage.messageInfo;
   return {
      messageId,
      created,
      createdBy,
      messageType,
      text
   };
}

export function publicMessages(dbMessages) {
   return dbMessages.map((dbMessage) => {
      return publicMessage(dbMessage);
   });
}
