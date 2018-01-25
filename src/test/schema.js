var AWS = require('aws-sdk');

AWS.config.update({
   region: 'us-west-2',
   //endpoint: 'dynamodb.us-west-2.amazonaws.com'
    endpoint: 'http://localhost:8000'
});

var dynamodb = new AWS.DynamoDB();

var tablePrefix = 'DEV_';

function createTable(params) {
   dynamodb.createTable(params, function(err, data) {
      if (err) {
         console.error('Unable to create table. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         // console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}


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


createTable(teamMembersParams);
createTable(teamRoomsParams);
createTable(teamRoomMembersParams);


function createSystemPropertiesTable() {
   var params = {
      TableName : tablePrefix + 'systemProperties',
      KeySchema: [
         { AttributeName: 'propertyName', KeyType: 'HASH'}
      ],
      AttributeDefinitions: [
         { AttributeName: 'propertyName', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
         ReadCapacityUnits: 10,
         WriteCapacityUnits: 10
      }
   };

   dynamodb.createTable(params, function(err, data) {
      if (err) {
         console.error('Unable to create SystemPropertiesTable. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         // console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}
createSystemPropertiesTable();


function createUsersTable() {
   var params = {
      TableName : tablePrefix + 'users',
      KeySchema: [
         { AttributeName: 'userId', KeyType: 'HASH'}  //Partition key
      ],
      AttributeDefinitions: [
         { AttributeName: 'userId', AttributeType: 'S' },
         { AttributeName: 'emailAddress', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
         ReadCapacityUnits: 10,
         WriteCapacityUnits: 10
      },
      GlobalSecondaryIndexes: [
         {
            IndexName: 'emailAddressIdx',
            KeySchema: [
               { AttributeName: 'emailAddress', KeyType: 'HASH' },
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
               ReadCapacityUnits: 10,
               WriteCapacityUnits: 10
            }
         }
      ]
   };

   dynamodb.createTable(params, function(err, data) {
      if (err) {
         console.error('Unable to create UsersTable. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         // console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}
createUsersTable();


function createSubscriberOrgsTable() {
   var params = {
      TableName : tablePrefix + 'subscriberOrgs',
      KeySchema: [
         { AttributeName: 'subscriberOrgId', KeyType: 'HASH'}  //Partition key
      ],
      AttributeDefinitions: [
         { AttributeName: 'subscriberOrgId', AttributeType: 'S' },
         { AttributeName: 'name', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
         ReadCapacityUnits: 10,
         WriteCapacityUnits: 10
      },
      GlobalSecondaryIndexes: [
         {
            IndexName: 'nameIdx',
            KeySchema: [
               { AttributeName: 'name', KeyType: 'HASH' },
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
               ReadCapacityUnits: 10,
               WriteCapacityUnits: 10
            }
         }
      ]
   };

   dynamodb.createTable(params, function(err, data) {
      if (err) {
         console.error('Unable to create UsersTable. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         // console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}
createSubscriberOrgsTable();


function createSubscriberUsersTable() {
   var params = {
      TableName : tablePrefix + 'subscriberUsers',
      KeySchema: [
         { AttributeName: 'subscriberUserId', KeyType: 'HASH'}  //Partition key
      ],
      AttributeDefinitions: [
         { AttributeName: 'subscriberUserId', AttributeType: 'S' },
         { AttributeName: 'userId', AttributeType: 'S' },
         { AttributeName: 'subscriberOrgId', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
         ReadCapacityUnits: 10,
         WriteCapacityUnits: 10
      },
      GlobalSecondaryIndexes: [
         {
            IndexName: 'userIdSubscriberOrgIdIdx',
            KeySchema: [
               { AttributeName: 'userId', KeyType: 'HASH' },
               { AttributeName: 'subscriberOrgId', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
               ReadCapacityUnits: 10,
               WriteCapacityUnits: 10
            }
         },
         {
            IndexName: 'subscriberOrgIdUserIdIdx',
            KeySchema: [
               { AttributeName: 'subscriberOrgId', KeyType: 'HASH' },
               { AttributeName: 'userId', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
               ReadCapacityUnits: 10,
               WriteCapacityUnits: 10
            }
         }
      ]
   };

   dynamodb.createTable(params, function(err, data) {
      if (err) {
         console.error('Unable to create SubscriberUsersTable. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         // console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}
createSubscriberUsersTable();


function createTeamsTable() {
   var params = {
      TableName : tablePrefix + 'teams',
      KeySchema: [
         { AttributeName: 'teamId', KeyType: 'HASH'}  //Partition key
      ],
      AttributeDefinitions: [
         { AttributeName: 'teamId', AttributeType: 'S' },
         { AttributeName: 'subscriberOrgId', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
         ReadCapacityUnits: 10,
         WriteCapacityUnits: 10
      },
      GlobalSecondaryIndexes: [
         {
            IndexName: 'subscriberOrgIdIdx',
            KeySchema: [
               { AttributeName: 'subscriberOrgId', KeyType: 'HASH' },
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
               ReadCapacityUnits: 10,
               WriteCapacityUnits: 10
            }
         }
      ]
   };

   dynamodb.createTable(params, function(err, data) {
      if (err) {
         console.error('Unable to create TeamsTable. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         // console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}
createTeamsTable();


function createConversationsTable() {
   var params = {
      TableName : tablePrefix + 'conversations',
      KeySchema: [
         { AttributeName: 'conversationId', KeyType: 'HASH'}  //Partition key
      ],
      AttributeDefinitions: [
         { AttributeName: 'conversationId', AttributeType: 'S' },
         { AttributeName: 'teamRoomId', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
         {
            IndexName: 'teamRoomIdIdx',
            KeySchema: [
               { AttributeName: 'teamRoomId', KeyType: 'HASH' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
               ReadCapacityUnits: 10,
               WriteCapacityUnits: 10
            }
         }
      ],
      ProvisionedThroughput: {
         ReadCapacityUnits: 10,
         WriteCapacityUnits: 10
      }
   };

   dynamodb.createTable(params, function(err, data) {
      if (err) {
         console.error('Unable to create ConversationsTable. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         // console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}
createConversationsTable();


function createConversationParticipantsTable() {
   var params = {
      TableName : tablePrefix + 'conversationParticipants',
      KeySchema: [
         { AttributeName: 'conversationId', KeyType: 'HASH'},  //Partition key
         { AttributeName: 'userId', KeyType: 'RANGE' }  //Sort key
      ],
      AttributeDefinitions: [
         { AttributeName: 'conversationId', AttributeType: 'S' },
         { AttributeName: 'userId', AttributeType: 'S' },
         { AttributeName: 'teamRoomId', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
         ReadCapacityUnits: 10,
         WriteCapacityUnits: 10
      },
      GlobalSecondaryIndexes: [
         {
            IndexName: 'userIdConversationIdIdx',
            KeySchema: [
               { AttributeName: 'userId', KeyType: 'HASH' },
               { AttributeName: 'conversationId', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
               ReadCapacityUnits: 10,
               WriteCapacityUnits: 10
            }
         },
         {
            IndexName: 'teamRoomIdUserIdIdx',
            KeySchema: [
               { AttributeName: 'teamRoomId', KeyType: 'HASH' },
               { AttributeName: 'userId', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
               ReadCapacityUnits: 10,
               WriteCapacityUnits: 10
            }
         }
      ]
   };

   dynamodb.createTable(params, function(err, data) {
      if (err) {
         console.error('Unable to create ConversationParticipantsTable. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         // console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}
createConversationParticipantsTable();


function createMessagesTable() {
   var params = {
      TableName : tablePrefix + 'messages',
      KeySchema: [
         { AttributeName: 'conversationId', KeyType: 'HASH'},  //Partition key
         { AttributeName: 'messageId', KeyType: 'RANGE' }  //Sort key
      ],
      AttributeDefinitions: [
         { AttributeName: 'conversationId', AttributeType: 'S' },
         { AttributeName: 'messageId', AttributeType: 'S' },
         { AttributeName: 'created', AttributeType: 'S' },
         { AttributeName: 'level', AttributeType: 'N' },
         { AttributeName: 'messageCount', AttributeType: 'N' }
      ],
      ProvisionedThroughput: {
         ReadCapacityUnits: 10,
         WriteCapacityUnits: 10
      },
      LocalSecondaryIndexes: [
         {
            IndexName: 'conversationIdCreatedIdx',
            KeySchema: [
               { AttributeName: 'conversationId', KeyType: 'HASH' },
               { AttributeName: 'created', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' }
         },
         {
            IndexName: 'conversationIdLevelIdx',
            KeySchema: [
               { AttributeName: 'conversationId', KeyType: 'HASH' },
               { AttributeName: 'level', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' }
         },
         {
            IndexName: 'conversationIdMessageCountIdx',
            KeySchema: [
               { AttributeName: 'conversationId', KeyType: 'HASH' },
               { AttributeName: 'messageCount', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' }
         }
      ]
   };

   dynamodb.createTable(params, function(err, data) {
      if (err) {
         console.error('Unable to create MessagesTable. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         // console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}
createMessagesTable();


function createUserMessageTable() {
   var params = {
      TableName : tablePrefix + 'userMessage',
      KeySchema: [
         { AttributeName: 'userId', KeyType: 'HASH'},  //Partition key
         { AttributeName: 'messageId', KeyType: 'RANGE' }  //Sort key
      ],
      AttributeDefinitions: [
         { AttributeName: 'userId', AttributeType: 'S' },
         { AttributeName: 'messageId', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
         ReadCapacityUnits: 10,
         WriteCapacityUnits: 10
      },
      GlobalSecondaryIndexes: [
         {
            IndexName: 'messageIdUserIdIdx',
            KeySchema: [
               { AttributeName: 'messageId', KeyType: 'HASH' },
               { AttributeName: 'userId', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
               ReadCapacityUnits: 10,
               WriteCapacityUnits: 10
            }
         }
      ]
   };

   dynamodb.createTable(params, function(err, data) {
      if (err) {
         console.error('Unable to create UserMessageTable. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         // console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}
createUserMessageTable();


function createReadMessagesTable() {
   var params = {
      TableName : tablePrefix + 'readMessages',
      KeySchema: [
         { AttributeName: 'userId', KeyType: 'HASH'},
         { AttributeName: 'conversationId', KeyType: 'RANGE' }
      ],
      AttributeDefinitions: [
         { AttributeName: 'userId', AttributeType: 'S' },
         { AttributeName: 'conversationId', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
         ReadCapacityUnits: 10,
         WriteCapacityUnits: 10
      }
   };

   dynamodb.createTable(params, function(err, data) {
      if (err) {
         console.error('Unable to create ReadMessagesTable. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         // console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}
createReadMessagesTable();


function createInvitationsTable() {
   var params = {
      TableName : tablePrefix + 'invitations',
      KeySchema: [
         { AttributeName: 'inviterUserId', KeyType: 'HASH'},  //Partition key
         { AttributeName: 'created', KeyType: 'RANGE' }  //Sort key
      ],
      AttributeDefinitions: [
         { AttributeName: 'inviterUserId', AttributeType: 'S' },
         { AttributeName: 'created', AttributeType: 'S' },
         { AttributeName: 'inviteeEmail', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
         ReadCapacityUnits: 10,
         WriteCapacityUnits: 10
      },
      GlobalSecondaryIndexes: [
         {
            IndexName: 'inviteeEmailCreatedIdx',
            KeySchema: [
               { AttributeName: 'inviteeEmail', KeyType: 'HASH' },
               { AttributeName: 'created', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
               ReadCapacityUnits: 10,
               WriteCapacityUnits: 10
            }
         }
      ]
   };

   dynamodb.createTable(params, function(err, data) {
      if (err) {
         console.error('Unable to create InvitationsTable. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         // console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}
createInvitationsTable();


function createAwsMarketplaceCustomerTable() {
   var params = {
      TableName : tablePrefix + 'awsMarketplaceCustomers',
      KeySchema: [
         { AttributeName: 'awsCustomerId', KeyType: 'HASH'}
      ],
      AttributeDefinitions: [
         { AttributeName: 'awsCustomerId', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
         ReadCapacityUnits: 10,
         WriteCapacityUnits: 10
      }
   };

   dynamodb.createTable(params, function(err, data) {
      if (err) {
         console.error('Unable to create AwsMarketplaceCustomerTable. Error JSON:', JSON.stringify(err, null, 2));
      } else {
         // console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}
createAwsMarketplaceCustomerTable();
