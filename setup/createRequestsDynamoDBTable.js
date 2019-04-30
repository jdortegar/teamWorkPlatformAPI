import AWS from 'aws-sdk';
import config from '../src/config/env'

AWS.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.awsRegion
});

AWS.config.dynamodb = { endpoint: config.dynamoDbEndpoint };

var dynamodb = new AWS.DynamoDB();

const tablePrefix = process.argv[2];

function createRequestTable(){
  const params = {
    TableName: `${tablePrefix}_requests`,
    KeySchema: [
      { AttributeName: 'requestId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'requestId', AttributeType: 'S'},
      { AttributeName: 'teamId', AttributeType: 'S'},
      { AttributeName: 'userId', AttributeType: 'S'},
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
    },
    GlobalSecondaryIndexes: [
      {
          IndexName: 'teamIdx',
          KeySchema: [
              { AttributeName: 'teamId', KeyType: 'HASH' }
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: {
              ReadCapacityUnits: 10,
              WriteCapacityUnits: 10
          }
      },
      {
        IndexName: 'userIdx',
        KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10
        }
      }
    ]
  }
  dynamodb.createTable(params, (err) => {
    if (err) {
        console.error(err);
    } else {
        console.info(`Table ${params.TableName} created`);
    }
  });
}

createRequestTable();
