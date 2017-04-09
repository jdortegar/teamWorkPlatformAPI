var AWS = require('aws-sdk');
var uuid = require('uuid');

var endpoint =
AWS.config.update({
   region: 'us-west-2',
   endpoint: 'dynamodb.us-west-2.amazonaws.com'
   //endpoint: 'http://localhost:8000'
});

var tablePrefix = 'DEV_';
var docClient = new AWS.DynamoDB.DocumentClient();

function addDocument(params) {
   console.log('Adding: ' + JSON.stringify(params));
   docClient.put(params, function(err, data) {
      if (err) {
         console.error('Unable to add item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         //console.log('Added item:', JSON.stringify(data, null, 2));
      }
   });
};
function addDocuments(documents) {
   if (documents instanceof Array) {
      for (var i = 0; i < documents.length; i++) {
         addDocuments(documents[i]);
      }
   } else {
      addDocument(documents);
   }
}


// Add user, subscriberOrg, and subscriberUser.
var userOrgSubs = [
   [
      { Item: { userInfo: { emailAddress: 'robert.abbott@habla.ai', firstName: 'Rob', lastName: 'Abbott', displayName: 'Rob Abbott', country: 'US', timeZone: 'America/Los_Angeles', icon: null, password: '$2a$11$fT4XWeKcQqW3daoSJdKILO4UDJIXNmtqimkvoj.y2PjEOcRhCVLZG' }, userId: 'ea794510-cea6-4132-ae22-a7ae1d32abb2', partitionId: -1 }, TableName: tablePrefix + 'users' },
      { Item: { subscriberOrgInfo: { name: 'Rob Abbott' }, subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d32abb3', partitionId: -1 }, TableName: tablePrefix + 'subscriberOrgs' },
      { Item: { subscriberUserInfo: { userId: 'ea794510-cea6-4132-ae22-a7ae1d32abb2', subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d32abb3' }, subscriberUserId: 'ea794510-cea6-4132-ae22-a7ae1d32abb4', partitionId: -1 }, TableName: tablePrefix + 'subscriberUsers' }
   ],
   [
      { Item: { userInfo: { emailAddress: 'anthony.daga@habla.ai', firstName: 'Anthony', lastName: 'Daga', displayName: 'Anthony Daga', country: 'US', timeZone: 'America/Los_Angeles', icon: null, password: '$2a$11$fT4XWeKcQqW3daoSJdKILO4UDJIXNmtqimkvoj.y2PjEOcRhCVLZG' }, userId: 'ea794510-cea6-4132-ae22-a7ae1d32abb5', partitionId: -1 }, TableName: tablePrefix + 'users' },
      { Item: { subscriberOrgInfo: { name: 'Anthony Daga' }, subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d32abb6', partitionId: -1 }, TableName: tablePrefix + 'subscriberOrgs' },
      { Item: { subscriberUserInfo: { userId: 'ea794510-cea6-4132-ae22-a7ae1d32abb5', subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d32abb6' }, subscriberUserId: 'ea794510-cea6-4132-ae22-a7ae1d32abb7', partitionId: -1 }, TableName: tablePrefix + 'subscriberUsers' }
   ]
];
addDocuments(userOrgSubs);


// Add standalone subscriberOrgs.
var subscriberOrgs = [
   { Item: { subscriberOrgInfo: { name: 'Acme' }, subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d324400', partitionId: -1 }, TableName: tablePrefix + 'subscriberOrgs' },
   { Item: { subscriberOrgInfo: { name: 'Nintento' }, subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d324401', partitionId: -1 }, TableName: tablePrefix + 'subscriberOrgs' }
];
addDocuments(subscriberOrgs);


// Add users to subscriberOrg 'Acme'.
var userSubscriberOrgs = [
   { Item: { subscriberUserInfo: { userId: 'ea794510-cea6-4132-ae22-a7ae1d32abb2', subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d324400' }, subscriberUserId: 'ea794510-cea6-4132-ae22-a7ae1d320010', partitionId: -1 }, TableName: tablePrefix + 'subscriberUsers' },
   { Item: { subscriberUserInfo: { userId: 'ea794510-cea6-4132-ae22-a7ae1d32abb5', subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d324400' }, subscriberUserId: 'ea794510-cea6-4132-ae22-a7ae1d320011', partitionId: -1 }, TableName: tablePrefix + 'subscriberUsers' }
];
addDocuments(userSubscriberOrgs);


// Add teams to subscriberOrg 'Acme'.
var teams = [
   { Item: { teamInfo: { name: 'A Team', subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d324400' }, teamId: 'ea794510-cea6-4132-ae22-a7ae1d321111', partitionId: -1 }, TableName: tablePrefix + 'teams' },
   { Item: { teamInfo: { name: 'B Team', subscriberOrgId: 'ea794510-cea6-4132-ae22-a7ae1d324400' }, teamId: 'ea794510-cea6-4132-ae22-a7ae1d321112', partitionId: -1 }, TableName: tablePrefix + 'teams' }
];
addDocuments(teams);


// Add teamMembers to 'A Team'.
var teamMembers = [
   { Item: { teamMemberInfo: { subscriberUserId: 'ea794510-cea6-4132-ae22-a7ae1d32abb4', teamId: 'ea794510-cea6-4132-ae22-a7ae1d321111' }, teamMemberId: 'ea794510-cea6-4132-ae22-a7ae1d323000', partitionId: -1 }, TableName: tablePrefix + 'teamMembers' },
   { Item: { teamMemberInfo: { subscriberUserId: 'ea794510-cea6-4132-ae22-a7ae1d32abb7', teamId: 'ea794510-cea6-4132-ae22-a7ae1d321111' }, teamMemberId: 'ea794510-cea6-4132-ae22-a7ae1d323001', partitionId: -1 }, TableName: tablePrefix + 'teamMembers' }
];
addDocuments(teamMembers);


// Add teamRooms to team 'A Team'.
var teamRooms = [
   { Item: { teamRoomInfo: { name: 'Posse', purpose: 'Place to hang.', publish: false, active: true, teamId: 'ea794510-cea6-4132-ae22-a7ae1d321111' }, teamRoomId: 'ea794510-cea6-4132-ae22-a7ae1d325000', partitionId: -1 }, TableName: tablePrefix + 'teamRooms' },
   { Item: { teamRoomInfo: { name: 'Friends', purpose: 'My buddies.', publish: true, active: true, teamId: 'ea794510-cea6-4132-ae22-a7ae1d321111' }, teamRoomId: 'ea794510-cea6-4132-ae22-a7ae1d325001', partitionId: -1 }, TableName: tablePrefix + 'teamRooms' }
];
addDocuments(teamRooms);


// Add teamRoomMember to teamRoom 'Posse'.
var teamRoomMembers = [
   { Item: { teamRoomMemberInfo: { teamMemberId: 'ea794510-cea6-4132-ae22-a7ae1d323000', teamRoomId: 'ea794510-cea6-4132-ae22-a7ae1d325000' }, teamRoomMemberId: 'ea794510-cea6-4132-ae22-a7ae1d323400', partitionId: -1 }, TableName: tablePrefix + 'teamRoomMembers' },
   { Item: { teamRoomMemberInfo: { teamMemberId: 'ea794510-cea6-4132-ae22-a7ae1d323001', teamRoomId: 'ea794510-cea6-4132-ae22-a7ae1d325000' }, teamRoomMemberId: 'ea794510-cea6-4132-ae22-a7ae1d323401', partitionId: -1 }, TableName: tablePrefix + 'teamRoomMembers' }
];
addDocuments(teamRoomMembers);


// Add conversations to teamRoom 'Posse'.
var conversations = [
   { Item: { conversationInfo: { userIds: ['ea794510-cea6-4132-ae22-a7ae1d32abb2', 'ea794510-cea6-4132-ae22-a7ae1d32abb5'], teamRoomId: 'ea794510-cea6-4132-ae22-a7ae1d325000' }, conversationId: 'ea794510-cea6-4132-ae22-a7ae1d327100', partitionId: -1 }, TableName: tablePrefix + 'conversations' },
];
addDocuments(conversations);


// Add messages to conversation of 'ea794510-cea6-4132-ae22-a7ae1d32abb2' and 'ea794510-cea6-4132-ae22-a7ae1d32abb5'.
var messages = [
   { Item: { conversationInfo: { created: '2016-03-21T17:42:34Z', createdBy: 'ea794510-cea6-4132-ae22-a7ae1d32abb2', text: 'How\'s it going?', messageType: 'text' }, messageId: 'ea794510-cea6-4132-ae22-a7ae1d120100', partitionId: -1 }, TableName: tablePrefix + 'messages' },
   { Item: { conversationInfo: { created: '2016-03-21T17:42:45Z', createdBy: 'ea794510-cea6-4132-ae22-a7ae1d32abb5', text: 'Alright', messageType: 'text' }, messageId: 'ea794510-cea6-4132-ae22-a7ae1d120101', partitionId: -1 }, TableName: tablePrefix + 'messages' },
   { Item: { conversationInfo: { created: '2016-03-21T17:42:56Z', createdBy: 'ea794510-cea6-4132-ae22-a7ae1d32abb2', text: 'Me too.', messageType: 'text' }, messageId: 'ea794510-cea6-4132-ae22-a7ae1d120102', partitionId: -1 }, TableName: tablePrefix + 'messages' },
];
addDocuments(messages);
