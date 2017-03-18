var AWS = require("aws-sdk");
var uuid = require("node-uuid");

AWS.config.update({
  region: "us-west-2",
  endpoint: "http://localhost:8000"
});

var dynamodb = new AWS.DynamoDB();
var tablePrefix = 'DEV_';
// create table

var params = {
    TableName : tablePrefix + "users",
    KeySchema: [       
        { AttributeName: "partitionId", KeyType: "HASH"},  //Partition key
        { AttributeName: "userGuid", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [       
        { AttributeName: "partitionId", AttributeType: "N" },
        { AttributeName: "userGuid", AttributeType: "S" }
    ],
    ProvisionedThroughput: {       
        ReadCapacityUnits: 10, 
        WriteCapacityUnits: 10
    }
};

dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});


// add document to table
/*
var docClient = new AWS.DynamoDB.DocumentClient()

var params = {
    TableName: "users",
    Item:{
        "partitionId": -1,
        "userGuid": "ea794510-cea6-4132-ae22-a7ae1d32abb1",
        "userInfo":{
            "emailAddress": "robert.abbott@habla.ai",
            "displayName": "Rob Abbott"
        }
    }
};

console.log("Adding a new item...");
docClient.put(params, function(err, data) {
    if (err) {
        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Added item:", JSON.stringify(data, null, 2));
    }
});

*/
