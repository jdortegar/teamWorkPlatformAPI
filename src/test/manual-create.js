var AWS = require('aws-sdk');
var uuid = require('uuid');

var endpoint =
AWS.config.update({
   region: 'us-west-2',
   endpoint: 'dynamodb.us-west-2.amazonaws.com'
   // endpoint: 'http://localhost:8000'
});

var tablePrefix = 'DEV_';
var docClient = new AWS.DynamoDB.DocumentClient();

function addDocument(params, log) {
   //console.log('Adding: ' + JSON.stringify(params));
   docClient.put(params, function(err, data) {
      if (err) {
         console.error('Unable to add item. Error JSON:', JSON.stringify(err, null, 2));
         console.error('Failed to add: ', JSON.stringify(params));
      } else if ((log) && (log === true)) {
         console.log('Added item: ', JSON.stringify(params, null, 2));
      }
   });
};
function addDocuments(documents, log) {
   if (documents instanceof Array) {
      for (var i = 0; i < documents.length; i++) {
         addDocuments(documents[i], log);
      }
   } else {
      addDocument(documents, log);
   }
}


// Add user, subscriberOrg, and subscriberUser.
/*
var userOrgSubs = [
   [
      { Item: { userInfo: { emailAddress: 'robert.abbott@habla.ai', firstName: 'Rob', lastName: 'Abbott', displayName: 'Rob Abbott', country: 'US', timeZone: 'America/Los_Angeles', icon: null, preferences: { private: {} }, password: '$2a$11$fT4XWeKcQqW3daoSJdKILO4UDJIXNmtqimkvoj.y2PjEOcRhCVLZG' }, userId: 'ea794510-cea6-4132-ae22-a7ae1d32abb2', partitionId: -1 }, TableName: tablePrefix + 'users' },
      { Item: { subscriberOrgInfo: { name: 'Rob Abbott', preferences: { private: {} } }, subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d32abb3', partitionId: -1 }, TableName: tablePrefix + 'subscriberOrgs' },
      { Item: { subscriberUserInfo: { userId: 'ea794510-cea6-4132-ae22-a7ae1d32abb2', subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d32abb3', role: 'admin' }, subscriberUserId: 'ea794510-cea6-4132-ae22-a7ae1d32abb4', partitionId: -1 }, TableName: tablePrefix + 'subscriberUsers' }
   ],
   [
      { Item: { userInfo: { emailAddress: 'anthony.daga@habla.ai', firstName: 'Anthony', lastName: 'Daga', displayName: 'Anthony Daga', country: 'US', timeZone: 'America/Los_Angeles', icon: null, preferences: { private: {} }, password: '$2a$11$fT4XWeKcQqW3daoSJdKILO4UDJIXNmtqimkvoj.y2PjEOcRhCVLZG' }, userId: 'ea794510-cea6-4132-ae22-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'users' },
      { Item: { subscriberOrgInfo: { name: 'Anthony Daga', preferences: { private: {} } }, subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d32abb6', partitionId: -1 }, TableName: tablePrefix + 'subscriberOrgs' },
         { Item: { subscriberUserInfo: { userId: 'ea794510-cea6-4132-ae22-a7ae1d32abb5', subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d32abb6', role: 'admin' }, subscriberUserId: 'ea794510-cea6-4132-ae22-a7ae1d32abb7', partitionId: -1 }, TableName: tablePrefix + 'subscriberUsers' }
   ],
   [
      { Item: { userInfo: { emailAddress: 'son.dao@habla.ai', firstName: 'Son', lastName: 'Dao', displayName: 'Son Dao', country: 'US', timeZone: 'America/Los_Angeles', icon: null, preferences: { private: {} }, password: '$2a$11$fT4XWeKcQqW3daoSJdKILO4UDJIXNmtqimkvoj.y2PjEOcRhCVLZG' }, userId: 'ea794510-cea6-4132-0000-aa8e1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'users' },
      { Item: { subscriberOrgInfo: { name: 'Son Dao', preferences: { private: {} } }, subscriberOrgId: 'ea794510-cea6-4132-0001-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'subscriberOrgs' },
      { Item: { subscriberUserInfo: { userId: 'ea794510-cea6-4132-0000-a7ae1d32abb5', subscriberOrgId: 'ea794510-cea6-4132-0001-a7ae1d32abb5', role: 'admin' }, subscriberUserId: 'ea794510-cea6-4132-0002-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'subscriberUsers' }
   ]
];
addDocuments(userOrgSubs);
*/

// Add standalone subscriberOrgs.
/*
var subscriberOrgs = [
   { Item: { subscriberOrgInfo: { name: 'Acme', preferences: { private: {} } }, subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d324400', partitionId: -1 }, TableName: tablePrefix + 'subscriberOrgs' },
   { Item: { subscriberOrgInfo: { name: 'Nintendo', preferences: { private: {} } }, subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d324401', partitionId: -1 }, TableName: tablePrefix + 'subscriberOrgs' }
];
addDocuments(subscriberOrgs);
*/

// Add users to subscriberOrg 'Acme'.
var userSubscriberOrgs = [
   { Item: { subscriberUserInfo: { userId: 'ee83ff32-8eba-42bf-b8a0-55a1194f8666', subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d324400', role: 'admin' }, subscriberUserId: '3d8252e5-a2db-495d-90e4-0ef517e7e069', partitionId: -1 }, TableName: tablePrefix + 'subscriberUsers' }
];
addDocuments(userSubscriberOrgs);


// Add teams to subscriberOrg 'Acme'.
/*var teams = [
   { Item: { teamInfo: { name: 'A Team', subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d324400' }, teamId: 'ea794510-cea6-4132-ae22-a7ae1d321111', partitionId: -1 }, TableName: tablePrefix + 'teams' },
   { Item: { teamInfo: { name: 'B Team', subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d324400' }, teamId: 'ea794510-cea6-4132-ae22-a7ae1d321112', partitionId: -1 }, TableName: tablePrefix + 'teams' }
];
addDocuments(teams);
*/

// Add teamMembers to 'A Team'.
var teamMembers = [
   { Item: { teamMemberInfo: { subscriberUserId: '3d8252e5-a2db-495d-90e4-0ef517e7e069', teamId: 'ea794510-cea6-4132-ae22-a7ae1d321111', userId: 'ee83ff32-8eba-42bf-b8a0-55a1194f8666', role: 'admin' }, teamMemberId: 'd301b5b9-ecb7-4612-802e-63a5ba8fdf26', partitionId: -1 }, TableName: tablePrefix + 'teamMembers' }
];
addDocuments(teamMembers);


// Add teamRooms to team 'A Team'.
/*
   { Item: { teamRoomInfo: { name: 'Posse', purpose: 'Place to hang.', publish: false, active: true, teamId: 'ea794510-cea6-4132-ae22-a7ae1d321111' }, teamRoomId: 'ea794510-cea6-4132-ae22-a7ae1d325000', partitionId: -1 }, TableName: tablePrefix + 'teamRooms' },
   { Item: { teamRoomInfo: { name: 'Friends', purpose: 'My buddies.', publish: true, active: true, teamId: 'ea794510-cea6-4132-ae22-a7ae1d321111' }, teamRoomId: 'ea794510-cea6-4132-ae22-a7ae1d325001', partitionId: -1 }, TableName: tablePrefix + 'teamRooms' }
];
addDocuments(teamRooms);
*/

// Add teamRoomMember to teamRoom 'Posse'.
var teamRoomMembers = [
   { Item: { teamRoomMemberInfo: { teamMemberId: 'd301b5b9-ecb7-4612-802e-63a5ba8fdf26', teamRoomId: 'ea794510-cea6-4132-ae22-a7ae1d325000', userId: 'ee83ff32-8eba-42bf-b8a0-55a1194f8666', role: 'admin' }, teamRoomMemberId: 'f47fced4-ba5f-48f3-a2af-77fa19f21487', partitionId: -1 }, TableName: tablePrefix + 'teamRoomMembers' }
];
addDocuments(teamRoomMembers);


// Add conversations to teamRoom 'Posse'.
/*
var conversations = [
   { Item: { conversationInfo: { teamRoomId: 'ea794510-cea6-4132-ae22-a7ae1d325000', created: '2017-03-21T17:42:34Z' }, conversationId: 'ea794510-cea6-4132-ae22-a7ae1d327100', partitionId: -1 }, TableName: tablePrefix + 'conversations' },
];
addDocuments(conversations);
*/

// Add conversation participants.
/*var conversationParticipants = [
   { Item: { conversationParticipantInfo: { userId: 'ea794510-cea6-4132-ae22-a7ae1d32abb2', conversationId: 'ea794510-cea6-4132-ae22-a7ae1d327100' }, conversationParticipantId: 'ea794510-cea6-4132-ae22-a7ae1d398400', partitionId: -1 }, TableName: tablePrefix + 'conversationParticipants' },
   { Item: { conversationParticipantInfo: { userId: 'ea794510-cea6-4132-ae22-a7ae1d32abb5', conversationId: 'ea794510-cea6-4132-ae22-a7ae1d327100' }, conversationParticipantId: 'ea794510-cea6-4132-ae22-a7ae1d398401', partitionId: -1 }, TableName: tablePrefix + 'conversationParticipants' }
]
addDocuments(conversationParticipants);
*/

// Add messages to conversation of 'ea794510-cea6-4132-ae22-a7ae1d32abb2' and 'ea794510-cea6-4132-ae22-a7ae1d32abb5'.
/*
var messages = [
   { Item: { messageInfo: { created: '2017-03-21T17:42:34Z', createdBy: 'ea794510-cea6-4132-ae22-a7ae1d32abb2', text: 'How\'s it going?', messageType: 'text', conversationId: 'ea794510-cea6-4132-ae22-a7ae1d327100' }, messageId: 'ea794510-cea6-4132-ae22-a7ae1d120100', partitionId: -1 }, TableName: tablePrefix + 'messages' },
   { Item: { messageInfo: { created: '2017-03-21T17:42:45Z', createdBy: 'ea794510-cea6-4132-ae22-a7ae1d32abb5', text: 'Alright', messageType: 'text', conversationId: 'ea794510-cea6-4132-ae22-a7ae1d327100' }, messageId: 'ea794510-cea6-4132-ae22-a7ae1d120101', partitionId: -1 }, TableName: tablePrefix + 'messages' },
   { Item: { messageInfo: { created: '2017-03-21T17:42:56Z', createdBy: 'ea794510-cea6-4132-ae22-a7ae1d32abb2', text: 'Me too.', messageType: 'text', conversationId: 'ea794510-cea6-4132-ae22-a7ae1d327100' }, messageId: 'ea794510-cea6-4132-ae22-a7ae1d120102', partitionId: -1 }, TableName: tablePrefix + 'messages' },
];
addDocuments(messages);
*/

// *************   Add Starbucks. ***************
/*
subscriberOrgs = [
   { Item: { subscriberOrgInfo: { name: 'Starbucks', preferences: { private: {} } }, subscriberOrgId: 'ea794510-cea6-4132-0003-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'subscriberOrgs' }
];
addDocuments(subscriberOrgs);
*/

var subscriberUsers = [
   { Item: { subscriberUserInfo: { userId: 'ee83ff32-8eba-42bf-b8a0-55a1194f8666', subscriberOrgId: 'ea794510-cea6-4132-0003-a7ae1d32abb5', role: 'user' }, subscriberUserId: '3e9372fb-fa84-4297-b43b-1eeed9f16376', partitionId: -1 }, TableName: tablePrefix + 'subscriberUsers' }
];
addDocuments(subscriberUsers);

/*
teams = [
   { Item: { teamInfo: { name: 'Development', subscriberOrgId: 'ea794510-cea6-4132-0003-a7ae1d32abb5' }, teamId: 'ea794510-cea6-4132-0007-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'teams' },
   { Item: { teamInfo: { name: 'UX', subscriberOrgId: 'ea794510-cea6-4132-0003-a7ae1d32abb5' }, teamId: 'ea794510-cea6-4132-0008-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'teams' }
];
addDocuments(teams);
*/

teamMembers = [
   { Item: { teamMemberInfo: { subscriberUserId: '3e9372fb-fa84-4297-b43b-1eeed9f16376', teamId: 'ea794510-cea6-4132-0008-a7ae1d32abb5', userId: 'ee83ff32-8eba-42bf-b8a0-55a1194f8666', role: 'user' }, teamMemberId: 'bcd99ea2-36c9-4ffa-af64-b9018f30a60e', partitionId: -1 }, TableName: tablePrefix + 'teamMembers' }
];
addDocuments(teamMembers);

/*
teamRooms = [
   { Item: { teamRoomInfo: { name: '3.4 Release', purpose: 'Prepare for next release.', publish: false, active: true, teamId: 'ea794510-cea6-4132-0008-a7ae1d32abb5' }, teamRoomId: 'ea794510-cea6-4132-0015-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'teamRooms' },
   { Item: { teamRoomInfo: { name: 'Intelligent Mockup', purpose: 'UI sprint planning.', publish: true, active: true, teamId: 'ea794510-cea6-4132-0008-a7ae1d32abb5' }, teamRoomId: 'ea794510-cea6-4132-0016-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'teamRooms' },
   { Item: { teamRoomInfo: { name: 'Profile Details', purpose: 'Detailed design of user profile pages.', publish: true, active: false, teamId: 'ea794510-cea6-4132-0008-a7ae1d32abb5' }, teamRoomId: 'ea794510-cea6-4132-0116-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'teamRooms' },
   { Item: { teamRoomInfo: { name: 'REST APIs for Mockups', purpose: null, publish: false, active: false, teamId: 'ea794510-cea6-4132-0008-a7ae1d32abb5' }, teamRoomId: 'ea794510-cea6-4132-0117-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'teamRooms' }
];
addDocuments(teamRooms);
*/

teamRoomMembers = [
   { Item: { teamRoomMemberInfo: { teamMemberId: 'bcd99ea2-36c9-4ffa-af64-b9018f30a60e', teamRoomId: 'ea794510-cea6-4132-0117-a7ae1d32abb5', userId: 'ee83ff32-8eba-42bf-b8a0-55a1194f8666', role: 'user' }, teamRoomMemberId: '13cb80bf-a5c9-45fb-a1ba-74d6654b8d08', partitionId: -1 }, TableName: tablePrefix + 'teamRoomMembers' }
];
addDocuments(teamRoomMembers);

/*
conversations = [
   { Item: { conversationInfo: { teamRoomId: 'ea794510-cea6-4132-0016-a7ae1d32abb5', created: '2016-04-10T09:15:34Z' }, conversationId: 'ea794510-cea6-4132-0023-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'conversations' },
   { Item: { conversationInfo: { teamRoomId: 'ea794510-cea6-4132-0015-a7ae1d32abb5', created: '2016-04-10T09:15:34Z' }, conversationId: 'ea794510-cea6-4132-0023-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'conversations' },
   { Item: { conversationInfo: { teamRoomId: 'ea794510-cea6-4132-0016-a7ae1d32abb5', created: '2016-04-10T09:15:34Z' }, conversationId: 'ea794510-cea6-4132-0023-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'conversations' },
];
addDocuments(conversations);
*/
/*
conversationParticipants = [
   { Item: { conversationParticipantInfo: { userId: 'ea794510-cea6-4132-ae22-a7ae1d32abb2', conversationId: 'ea794510-cea6-4132-0023-a7ae1d32abb5' }, conversationParticipantId: 'ea794510-cea6-4132-0024-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'conversationParticipants' },
   { Item: { conversationParticipantInfo: { userId: 'ea794510-cea6-4132-ae22-a7ae1d32abb5', conversationId: 'ea794510-cea6-4132-0023-a7ae1d32abb5' }, conversationParticipantId: 'ea794510-cea6-4132-0025-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'conversationParticipants' },
   { Item: { conversationParticipantInfo: { userId: 'ea794510-cea6-4132-0000-aa8e1d32abb5', conversationId: 'ea794510-cea6-4132-0023-a7ae1d32abb5' }, conversationParticipantId: 'ea794510-cea6-4132-0026-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'conversationParticipants' }
]
addDocuments(conversationParticipants);
*/
/*
messages = [
   { Item: { messageInfo: { created: '2017-04-08T09:22:34Z', createdBy: 'ea794510-cea6-4132-ae22-a7ae1d32abb5', text: 'Hi, how was your weekend? Did you go fishing?', messageType: 'text', conversationId: 'ea794510-cea6-4132-0023-a7ae1d32abb5', level: 0, path: 'ea794510-cea6-4132-0027-a7ae1d32abb5' }, messageId: 'ea794510-cea6-4132-0027-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'messages' },
   { Item: { messageInfo: { created: '2017-04-08T09:22:45Z', createdBy: 'ea794510-cea6-4132-0000-aa8e1d32abb5', text: 'Hi, I had a great weekend. Thanks! I did go fishing but I didn\'t catch anything.', messageType: 'text', conversationId: 'ea794510-cea6-4132-0023-a7ae1d32abb5', level: 0, path: 'ea794510-cea6-4132-0028-a7ae1d32abb5' }, messageId: 'ea794510-cea6-4132-0028-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'messages' },
   { Item: { messageInfo: { created: '2017-04-08T09:22:56Z', createdBy: 'ea794510-cea6-4132-ae22-a7ae1d32abb2', text: 'Oh, A, you should have come out with us. It was great.', messageType: 'text', conversationId: 'ea794510-cea6-4132-0023-a7ae1d32abb5', level: 0, path: 'ea794510-cea6-4132-0029-a7ae1d32abb5' }, messageId: 'ea794510-cea6-4132-0029-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'messages' },
   { Item: { messageInfo: { created: '2017-04-08T09:23:12Z', createdBy: 'ea794510-cea6-4132-ae22-a7ae1d32abb5', text: 'Thanks again for the invite but I had work to catch up on.', messageType: 'text', conversationId: 'ea794510-cea6-4132-0023-a7ae1d32abb5', replyTo: 'ea794510-cea6-4132-0029-a7ae1d32abb5', level: 1, path: 'ea794510-cea6-4132-0029-a7ae1d32abb5##ea794510-cea6-4132-0030-a7ae1d32abb5' }, messageId: 'ea794510-cea6-4132-0030-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'messages' },
   { Item: { messageInfo: { created: '2017-04-08T09:23:20Z', createdBy: 'ea794510-cea6-4132-ae22-a7ae1d32abb2', text: 'It\'s okay. Maybe next time.', messageType: 'text', conversationId: 'ea794510-cea6-4132-0023-a7ae1d32abb5', replyTo: 'ea794510-cea6-4132-0029-a7ae1d32abb5', level: 1, path: 'ea794510-cea6-4132-0029-a7ae1d32abb5##ea794510-cea6-4132-0031-a7ae1d32abb5' }, messageId: 'ea794510-cea6-4132-0031-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'messages' },
   { Item: { messageInfo: { created: '2017-04-08T09:23:34Z', createdBy: 'ea794510-cea6-4132-ae22-a7ae1d32abb5', text: 'Oh, that was too bad. I bet it was nice to be outside though. The weather was great. I unfortunately had to go to the office.', messageType: 'text', conversationId: 'ea794510-cea6-4132-0023-a7ae1d32abb5', level: 0, path: 'ea794510-cea6-4132-0032-a7ae1d32abb5' }, messageId: 'ea794510-cea6-4132-0032-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'messages' },
   { Item: { messageInfo: { created: '2017-04-08T09:23:45Z', createdBy: 'ea794510-cea6-4132-0000-aa8e1d32abb5', text: 'I see, by the way, did you get a chance to see those wireframes I sent you on Friday?', messageType: 'text', conversationId: 'ea794510-cea6-4132-0023-a7ae1d32abb5', level: 0, path: 'ea794510-cea6-4132-0033-a7ae1d32abb5' }, messageId: 'ea794510-cea6-4132-0033-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'messages' },
   { Item: { messageInfo: { created: '2017-04-08T09:23:55Z', createdBy: 'ea794510-cea6-4132-ae22-a7ae1d32abb5', text: 'Yes, I did. They all looked fine. I think the client will be in for a nice surprise. We are going to over deliver on what we promise.', messageType: 'text', conversationId: 'ea794510-cea6-4132-0023-a7ae1d32abb5', level: 0, path: 'ea794510-cea6-4132-0034-a7ae1d32abb5' }, messageId: 'ea794510-cea6-4132-0034-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'messages' }
];
addDocuments(messages);
*/