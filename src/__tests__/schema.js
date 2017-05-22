import AWS from 'aws-sdk';
import config from '../config/env';

AWS.config.update({
   region: 'us-west-2',
   endpoint: 'http://localhost:8000'
});

const dynamodb = new AWS.DynamoDB();

const tablePrefix = config.tablePrefix;

function createTable(params) {
   return new Promise((resolve, reject) => {
      dynamodb.createTable(params, function (err, data) {
         if (err) {
            console.error('Unable to create table. Error JSON:', JSON.stringify(err, null, 2));
            reject(err);
         } else {
            console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
            resolve();
         }
      });
   });
}

function deleteTable(tableName) {
   return new Promise((resolve, reject) => {
      dynamodb.deleteTable({ TableName: tableName}, function (err, data) {
         if (err) {
            console.error('Unable to delete table. Error JSON:', JSON.stringify(err, null, 2));
            reject(err);
         } else {
            console.log('Delete table. Table description JSON:', JSON.stringify(data, null, 2));
            resolve();
         }
      });
   });
}


const usersParams = {
   TableName: `${tablePrefix}users`,
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH' },  //Partition key
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

const subscriberOrgsParams = {
   TableName: `${tablePrefix}subscriberOrgs`,
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH' },  //Partition key
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

const subscriberUsersParams = {
   TableName: `${tablePrefix}subscriberUsers`,
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH' },  //Partition key
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

const teamsParams = {
   TableName: `${tablePrefix}teams`,
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH' },  //Partition key
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

const teamMembersParams = {
   TableName: `${tablePrefix}teamMembers`,
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH' },  //Partition key
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

const teamRoomsParams = {
   TableName: `${tablePrefix}teamRooms`,
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH' },  //Partition key
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

const teamRoomMembersParams = {
   TableName: `${tablePrefix}teamRoomMembers`,
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH' },  //Partition key
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

const conversationsParams = {
   TableName: `${tablePrefix}conversations`,
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH' },  //Partition key
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

const conversationParticipantsParams = {
   TableName: `${tablePrefix}conversationParticipants`,
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH' },  //Partition key
      { AttributeName: 'conversationParticipantId', KeyType: 'RANGE' }  //Sort key
   ],
   AttributeDefinitions: [
      { AttributeName: 'partitionId', AttributeType: 'N' },
      { AttributeName: 'conversationParticipantId', AttributeType: 'S' }
   ],
   ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
   }
};

const messagesParams = {
   TableName: `${tablePrefix}messages`,
   KeySchema: [
      { AttributeName: 'partitionId', KeyType: 'HASH' },  //Partition key
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

export function createAllTables() {
   return Promise.all([
      createTable(usersParams),
      createTable(subscriberOrgsParams),
      createTable(subscriberUsersParams),
      createTable(teamsParams),
      createTable(teamMembersParams),
      createTable(teamRoomsParams),
      createTable(teamRoomMembersParams),
      createTable(conversationsParams),
      createTable(conversationParticipantsParams),
      createTable(messagesParams)
   ]);
}

export function deleteAllTables() {
   return Promise.all([
      deleteTable(usersParams.TableName),
      deleteTable(subscriberOrgsParams.TableName),
      deleteTable(subscriberUsersParams.TableName),
      deleteTable(teamsParams.TableName),
      deleteTable(teamMembersParams.TableName),
      deleteTable(teamRoomsParams.TableName),
      deleteTable(teamRoomMembersParams.TableName),
      deleteTable(conversationsParams.TableName),
      deleteTable(conversationParticipantsParams.TableName),
      deleteTable(messagesParams.TableName)
   ]);
}
