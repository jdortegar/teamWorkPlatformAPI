var AWS = require('aws-sdk');
var uuid = require('uuid');

var endpoint =
AWS.config.update({
   region: 'us-west-2',
   endpoint: 'dynamodb.us-west-2.amazonaws.com'
   // endpoint: 'http://localhost:8000'
});

var dynamodb = new AWS.DynamoDB();

var tablePrefix = 'DEV_';

function deleteTable(params) {
   dynamodb.deleteTable(params, function(err, data) {
      if (err) {
         console.error('Unable to delete table.  Error JSON:', JSON.stringify(err, null, 2));
      } else {
         console.log('Deleted table.  Table description JSON:', JSON.stringify(data, null, 2));
      }
   });
}

deleteTable({TableName: tablePrefix + 'users'});
deleteTable({TableName: tablePrefix + 'subscriberOrgs'});
deleteTable({TableName: tablePrefix + 'subscriberUsers'});
deleteTable({TableName: tablePrefix + 'teams'});
deleteTable({TableName: tablePrefix + 'teamMembers'});
deleteTable({TableName: tablePrefix + 'teamRooms'});
deleteTable({TableName: tablePrefix + 'teamRoomMembers'});
deleteTable({TableName: tablePrefix + 'conversations'});
deleteTable({TableName: tablePrefix + 'conversationParticipants'});
deleteTable({TableName: tablePrefix + 'messages'});
