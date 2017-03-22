//---------------------------------------------------------------------
// helpers/index.js
// 
// default file to load all helper logic
//---------------------------------------------------------------------
//  Date         Initials    Description
//  ----------   --------    ------------------------------------------
//  2017-02-02    RLA         Initial module creation
//
//---------------------------------------------------------------------

//TODO: deprecated?  if so, remove this?

var config = require('./config/env');
var debug = require('debug')('index');
var MongoClient = require('mongodb').MongoClient;

var app = require('./config/express');

MongoClient.connect(config.db, (err, db) => {
  if (err) throw err;
  app.locals.db = db;
  app.listen(config.port, function() {
    console.log('Server started on port ' + config.port);
  });
});
