//---------------------------------------------------------------------
// src/index.js
// 
// container for hablaapi service
//---------------------------------------------------------------------
//  Date         Initials    Description
//  ----------   --------    ------------------------------------------
//  2017-02-02    RLA         Initial module creation
//
//---------------------------------------------------------------------

var config = require('./config/env');
var debug = require('debug')('index');
var AWS = require('aws-sdk');

var redis = require('redis');

//var MongoClient = require('mongodb').MongoClient;

// Read environment vars or use defaults

var app = require('./config/express');

console.log('Habla API Startup');
console.log('---------------------------------------------------------');
console.log('AWS Region       : ' + config.aws.awsRegion);
console.log('DynamoDB Endpoint: ' + config.dynamoDbEndpoint);
console.log('Table Prefix     : ' + config.tablePrefix);
console.log('Redis Server     : ' + config.cacheServer);
console.log('Redis Port       : ' + config.cachePort);
console.log('NodeJS Port      : ' + config.nodePort);

AWS.config.update({
  region: config.aws.awsRegion,
  endpoint: config.dynamoDbEndpoint
});

var redisConfig = {
	host: config.cacheServer,
	port: config.cachePort
}

var dynamodb = new AWS.DynamoDB();
var redisclient = redis.createClient(redisConfig);

redisclient.on("error", function (err) {
    console.log("Redis Client Error " + err);
});

app.locals.db = dynamodb;
app.locals.redis = redisclient;


var server = app.listen(config.nodePort, function() {
    console.log('Server started on port ' + config.nodePort);
    console.log('---------------------------------------------------------');

  });

// this function is called when you want the server to die gracefully
// i.e. wait for existing connections
var gracefulShutdown = function() {
  console.log("Received kill signal, shutting down gracefully.");
  server.close(function() {
    console.log("Closed out remaining connections.");
    redisclient.quit();
    process.exit()
  });
  
   // if after 
   setTimeout(function() {
       console.error("Could not close connections in time, forcefully shutting down");
       redisclient.end(true);
       process.exit()
  }, 10*1000);
}

// listen for TERM signal .e.g. kill 
process.on ('SIGTERM', gracefulShutdown);

// listen for INT signal e.g. Ctrl-C
process.on ('SIGINT', gracefulShutdown); 

