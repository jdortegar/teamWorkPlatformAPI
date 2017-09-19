import _ from 'lodash';

function privateUser(dbUser) {
   const userId = dbUser.userId;
   const { emailAddress, firstName, lastName, displayName, country, timeZone, icon, enabled, preferences, created, lastModified, role, presence } = dbUser.userInfo || dbUser;
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
      presence,
      // roleMemberships: dbUser.roleMemberships,
      // defaultPage: dbUser.defaultPage,
      userType: dbUser.userType || 'hablaUser'
   };
}

function publicUser(dbUser) {
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

function publicUsers(dbUsers) {
   return dbUsers.map((dbUser) => {
      return publicUser(dbUser);
   });
}


function privateSubscriberOrg(dbSubscriberOrg) {
   const subscriberOrgId = dbSubscriberOrg.subscriberOrgId;
   const { name, enabled, preferences, created, lastModified } = dbSubscriberOrg.subscriberOrgInfo || dbSubscriberOrg;
   return {
      subscriberOrgId,
      name,
      enabled,
      preferences: _.cloneDeep(preferences),
      created,
      lastModified
   };
}

function publicSubscriberOrg(dbSubscriberOrg) {
   const ret = privateSubscriberOrg(dbSubscriberOrg);
   if ((ret.preferences) && (ret.preferences.private)) {
      delete ret.preferences.private;
   }
   return ret;
}

function publicSubscriberOrgs(dbSubscriberOrgs) {
   return dbSubscriberOrgs.map((dbSubscriberOrg) => {
      return publicSubscriberOrg(dbSubscriberOrg);
   });
}

function publicSubscriber(subscriberOrgId, dbUser) {
   return {
      subscriberOrgId,
      user: publicUser(dbUser)
   };
}


function privateTeam(dbTeam) {
   const teamId = dbTeam.teamId;
   const { subscriberOrgId, name, active, primary, preferences, created, lastModified } = dbTeam.teamInfo || dbTeam;
   return {
      teamId,
      subscriberOrgId,
      name,
      active,
      primary,
      preferences: _.cloneDeep(preferences),
      created,
      lastModified
   };
}

function publicTeam(dbTeam) {
   const ret = privateTeam(dbTeam);
   if ((ret.preferences) && (ret.preferences.private)) {
      delete ret.preferences.private;
   }
   return ret;
}

function publicTeams(dbTeams) {
   return dbTeams.map((dbTeam) => {
      return publicTeam(dbTeam);
   });
}

function publicTeamMember(teamId, dbUser) {
   return {
      teamId,
      user: publicUser(dbUser)
   };
}


function privateTeamRoom(dbTeamRoom) {
   const teamRoomId = dbTeamRoom.teamRoomId;
   const { teamId, name, purpose, publish, active, primary, preferences, created, lastModified } = dbTeamRoom.teamRoomInfo || dbTeamRoom;
   return {
      teamRoomId,
      teamId,
      name,
      purpose,
      publish,
      active,
      primary,
      preferences: _.cloneDeep(preferences),
      created,
      lastModified
   };
}

function publicTeamRoom(dbTeamRoom) {
   const ret = privateTeamRoom(dbTeamRoom);
   if ((ret.preferences) && (ret.preferences.private)) {
      delete ret.preferences.private;
   }
   return ret;
}

function publicTeamRooms(dbTeamRooms) {
   return dbTeamRooms.map((dbTeamRoom) => {
      return publicTeamRoom(dbTeamRoom);
   });
}

function publicTeamRoomMember(teamRoomId, dbUser) {
   return {
      teamRoomId,
      user: publicUser(dbUser)
   };
}


function publicConversation(dbConversation) {
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
}

function publicConversations(dbConversations) {
   return dbConversations.map((dbConversation) => {
      return publicConversation(dbConversation);
   });
}


function publicMessage(dbMessage) {
   const messageId = dbMessage.messageId;
   const { conversationId, createdBy, messageType, text, replyTo, path, level, created, lastModified } = dbMessage.messageInfo || dbMessage;
   return {
      messageId,
      conversationId,
      createdBy,
      messageType,
      text,
      replyTo,
      path,
      level,
      created,
      lastModified
   };
}

function publicMessages(dbMessages) {
   return dbMessages.map((dbMessage) => {
      return publicMessage(dbMessage);
   });
}

function publicIntegration(integration) {
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
}

function publicIntegrations(integrations) {
   return integrations.map(integration => publicIntegration(integration));
}


// Index in the array is the version number to publish against.
export const apiVersionedVisibility = {
   privateUser: [
      privateUser,
      privateUser
   ],
   publicUser: [
      publicUser,
      publicUser
   ],
   publicUsers: [
      publicUsers,
      publicUsers
   ],
   privateSubscriberOrg: [
      privateSubscriberOrg,
      privateSubscriberOrg
   ],
   publicSubscriberOrg: [
      publicSubscriberOrg,
      publicSubscriberOrg
   ],
   publicSubscriberOrgs: [
      publicSubscriberOrgs,
      publicSubscriberOrgs
   ],
   publicSubscriber: [
      publicSubscriber,
      publicSubscriber
   ],
   privateTeam: [
      privateTeam,
      privateTeam
   ],
   publicTeam: [
      publicTeam,
      publicTeam
   ],
   publicTeams: [
      publicTeams,
      publicTeams
   ],
   publicTeamMember: [
      publicTeamMember,
      publicTeamMember
   ],
   privateTeamRoom: [
      privateTeamRoom,
      privateTeamRoom
   ],
   publicTeamRoom: [
      publicTeamRoom,
      publicTeamRoom
   ],
   publicTeamRooms: [
      publicTeamRooms,
      publicTeamRooms
   ],
   publicTeamRoomMember: [
      publicTeamRoomMember,
      publicTeamRoomMember
   ],
   publicConversation: [
      publicConversation,
      publicConversation
   ],
   publicConversations: [
      publicConversations,
      publicConversations
   ],
   publicMessage: [
      publicMessage,
      publicMessage
   ],
   publicMessages: [
      publicMessages,
      publicMessages
   ],
   publicIntegration: [
      publicIntegration,
      publicIntegration
   ],
   publicIntegrations: [
      publicIntegrations,
      publicIntegrations
   ]
};

export function publishByApiVersion(req, publishers, ...args) {
   return publishers[req.apiVersion](...args);
}
