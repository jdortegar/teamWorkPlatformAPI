import Joi from 'joi';


const validationSchemas = {
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

export default validationSchemas;

