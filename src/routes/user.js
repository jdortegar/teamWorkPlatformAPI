var express = require('express');
var validate = require('express-validation');
var paramValidation = require('../config/param-validation');
var users = require('../controllers/users');
var containsRole = require('../policies').containsRole;
var roles = require('../policies').roles;

var router = express.Router();

router.route('/')
  .post(validate(paramValidation.createUser), users.create)
  .delete(users.del);

router.route('/:userId')
  .put(users.update);


router.route('/passwordreset')
  .post(users.resetPassword);

router.route('/passwordupdate')
  .post(users.updatePassword);

module.exports = router;
