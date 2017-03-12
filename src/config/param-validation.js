var Joi = require('joi');


var validationSchemas = {
  createUser: {
    body: {
      email: Joi.string().email().required()
    }
  },
  registerUser: {
    body: {
      email: Joi.string().email().required()
    }
  }

};

module.exports = validationSchemas;
