var AWS = require('aws-sdk');
var uuid = require('uuid');

var endpoint =
AWS.config.update({
   region: 'us-west-2',
   endpoint: 'dynamodb.us-west-2.amazonaws.com'
   //endpoint: 'http://localhost:8000'
});

var dynamodb = new AWS.DynamoDB();

var tablePrefix = 'DEV_';

function createTable(params) {
   dynamodb.createTable(params, function(err, data) {
      if (err) {
         console.error('Unable to create table. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}


var usersParams = {
   TableName : tablePrefix + 'users',
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH'},  //Partition key
      { AttributeName: 'userId', KeyType: 'RANGE' }  //Sort key
   ],
   AttributeDefinitions: [
      { AttributeName: 'partitionId', AttributeType: 'N' },
      { AttributeName: 'userId', AttributeType: 'S' }
   ],
   ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
   }
};

var subscriberOrgsParams = {
   TableName : tablePrefix + 'subscriberOrgs',
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH'},  //Partition key
      { AttributeName: 'subscriberOrgId', KeyType: 'RANGE' }  //Sort key
   ],
   AttributeDefinitions: [
      { AttributeName: 'partitionId', AttributeType: 'N' },
      { AttributeName: 'subscriberOrgId', AttributeType: 'S' }
   ],
   ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
   }
};

var subscriberUsersParams = {
   TableName : tablePrefix + 'subscriberUsers',
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH'},  //Partition key
      { AttributeName: 'subscriberUserId', KeyType: 'RANGE' }  //Sort key
   ],
   AttributeDefinitions: [
      { AttributeName: 'partitionId', AttributeType: 'N' },
      { AttributeName: 'subscriberUserId', AttributeType: 'S' }
   ],
   ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
   }
};

var teamsParams = {
   TableName : tablePrefix + 'teams',
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH'},  //Partition key
      { AttributeName: 'teamId', KeyType: 'RANGE' }  //Sort key
   ],
   AttributeDefinitions: [
      { AttributeName: 'partitionId', AttributeType: 'N' },
      { AttributeName: 'teamId', AttributeType: 'S' }
   ],
   ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
   }
};

var teamMembersParams = {
   TableName : tablePrefix + 'teamMembers',
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH'},  //Partition key
      { AttributeName: 'teamMemberId', KeyType: 'RANGE' }  //Sort key
   ],
   AttributeDefinitions: [
      { AttributeName: 'partitionId', AttributeType: 'N' },
      { AttributeName: 'teamMemberId', AttributeType: 'S' }
   ],
   ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
   }
};

var teamRoomsParams = {
   TableName : tablePrefix + 'teamRooms',
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH'},  //Partition key
      { AttributeName: 'teamRoomId', KeyType: 'RANGE' }  //Sort key
   ],
   AttributeDefinitions: [
      { AttributeName: 'partitionId', AttributeType: 'N' },
      { AttributeName: 'teamRoomId', AttributeType: 'S' }
   ],
   ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
   }
};

var teamRoomMembersParams = {
   TableName : tablePrefix + 'teamRoomMembers',
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH'},  //Partition key
      { AttributeName: 'teamRoomMemberId', KeyType: 'RANGE' }  //Sort key
   ],
   AttributeDefinitions: [
      { AttributeName: 'partitionId', AttributeType: 'N' },
      { AttributeName: 'teamRoomMemberId', AttributeType: 'S' }
   ],
   ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
   }
};

var conversationsParams = {
   TableName : tablePrefix + 'conversations',
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH'},  //Partition key
      { AttributeName: 'conversationId', KeyType: 'RANGE' }  //Sort key
   ],
   AttributeDefinitions: [
      { AttributeName: 'partitionId', AttributeType: 'N' },
      { AttributeName: 'conversationId', AttributeType: 'S' }
   ],
   ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
   }
};

var messagesParams = {
   TableName : tablePrefix + 'messages',
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH'},  //Partition key
      { AttributeName: 'messageId', KeyType: 'RANGE' }  //Sort key
   ],
   AttributeDefinitions: [
      { AttributeName: 'partitionId', AttributeType: 'N' },
      { AttributeName: 'messageId', AttributeType: 'S' }
   ],
   ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
   }
};



createTable(usersParams);
createTable(subscriberOrgsParams);
createTable(subscriberUsersParams);
createTable(teamsParams);
createTable(teamMembersParams);
createTable(teamRoomsParams);
createTable(teamRoomMembersParams);
createTable(conversationsParams);
createTable(messagesParams);

