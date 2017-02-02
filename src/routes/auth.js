//---------------------------------------------------------------------
// routes/auth.js
// 
// route for /auth service
//---------------------------------------------------------------------
//  Date         Initials    Description
//  ----------   --------    ------------------------------------------
//  2017-02-02    RLA         Initial module creation
//
//---------------------------------------------------------------------

var auth = require('../controllers/auth');
var express = require('express');

var router = express.Router();

router.route('/')
  .post(auth.login);

module.exports = router;
