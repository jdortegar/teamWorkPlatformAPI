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
