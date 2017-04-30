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
         icon: Joi.string().base64().allow(null),
         preferences: Joi.object().keys({
            private: Joi.object()
         })
      }
   },
   updateUser: {
      body: {
         firstName: Joi.string().min(1),
         lastName: Joi.string().min(1),
         displayName: Joi.string().min(1),
         country: Joi.string().min(1),
         timeZone: Joi.string().min(1),
         icon: Joi.string().base64().allow(null),
         preferences: Joi.object().keys({
            private: Joi.object()
         })
      }
   },
   updateUserPublicPreferences: {
      body: {
         preferences: Joi.object().min(1).keys({
            private: Joi.any().forbidden()
         }).required()
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
         name: Joi.string().min(1).required(),
         preferences: Joi.object().keys({
            private: Joi.object().required()
         })
      }
   },
   updateSubscriberOrg: {
      body: {
         name: Joi.string().min(1),
         preferences: Joi.object().keys({
            private: Joi.object()
         })
      }
   },
   createMessage: {
      body: {
         messageType: Joi.string().min(1).required(),
         text: Joi.string().min(1).required(),
         replyTo: Joi.string().min(1).allow(null)
      }
   }
};

export default validationSchemas;
