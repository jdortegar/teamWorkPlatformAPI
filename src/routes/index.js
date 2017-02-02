//---------------------------------------------------------------------
// routes/index.js
// 
// default route handler for hablaapi service
//---------------------------------------------------------------------
//  Date         Initials    Description
//  ----------   --------    ------------------------------------------
//  2017-02-02    RLA         Initial module creation
//
//---------------------------------------------------------------------

var express = require('express');
var router = express.Router();
var authRoutes = require('./auth');

var containsRole = require('../policies').containsRole;
var containsAnyRole = require('../policies').containsAnyRole;
var roles = require('../policies').roles;


/** GET /test - Check service health */
router.get('/test', function(req, res) {
  var response = {
    status: 'SUCCESS'
  };
  res.json(response);
});

var isHablaUser = containsRole(roles.hablaUser);

router.use('/auth/userAuth', authRoutes);

module.exports = router;
