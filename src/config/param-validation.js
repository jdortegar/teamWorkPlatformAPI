import Joi from 'joi';


const validationSchemas = {
   registerUser: {
      body: {
         email: Joi.string().email().required()
      }
   },
   createUser: {
      body: {
         firstName: Joi.string().min(1).required(),
         lastName: Joi.string().min(1).required(),
         displayName: Joi.string().min(1).required(),
         email: Joi.string().email().required(),
         password: Joi.string().min(1).required(),
         country: Joi.string().min(1).required(),
         timeZone: Joi.string().min(1).required(),
         icon: Joi.string().base64().allow(null)
      }
   },
   login: {
      body: {
         username: Joi.string().email().required(),
         password: Joi.string().required()
      }
   },
   createSubscriberOrg: {
      body: {
         name: Joi.string().min(1).required()
      }
   }
};

export default validationSchemas;

