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
var MongoClient = require('mongodb').MongoClient;

var app = require('./config/express');

MongoClient.connect(config.db, function(err, db) {
  if (err) throw err;
  app.locals.db = db;
  app.listen(config.port, function() {
    console.log('Server started on port ' + config.port);
  });
});
