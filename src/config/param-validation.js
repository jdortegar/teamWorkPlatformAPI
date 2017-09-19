import Joi from 'joi';
import validate from 'express-validation';


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
            iconColor: Joi.string().min(1),
            private: Joi.object()
         })
      }
   },
   updateUser: {
      body: {
         active: Joi.boolean(),
         firstName: Joi.string().min(1),
         lastName: Joi.string().min(1),
         displayName: Joi.string().min(1),
         country: Joi.string().min(1),
         timeZone: Joi.string().min(1),
         icon: Joi.string().base64().allow(null),
         preferences: Joi.object().keys({
            iconColor: Joi.string().min(1),
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
            iconColor: Joi.string().min(1),
            private: Joi.object().required()
         })
      }
   },
   updateSubscriberOrg: {
      body: {
         name: Joi.string().min(1),
         preferences: Joi.object().keys({
            iconColor: Joi.string().min(1),
            private: Joi.object()
         })
      }
   },
   inviteSubscribers: {
      body: {
         userIdOrEmails: Joi.array().min(1).items(
            Joi.string().min(1).required()
         ).required()
      }
   },
   replyToInvite: {
      body: {
         accept: Joi.boolean().required()
      }
   },
   createTeam: {
      body: {
         name: Joi.string().min(1).required(),
         preferences: Joi.object().keys({
            private: Joi.object().required()
         })
      }
   },
   updateTeam: {
      body: {
         name: Joi.string().min(1),
         active: Joi.boolean(),
         preferences: Joi.object().keys({
            private: Joi.object()
         })
      }
   },
   inviteTeamMembers: {
      body: {
         userIds: Joi.array().min(1).items(
            Joi.string().min(1).required()
         ).required()
      }
   },
   createTeamRoom: {
      body: {
         name: Joi.string().min(1).required(),
         purpose: Joi.string().min(1),
         publish: Joi.boolean().required(),
         active: Joi.boolean().required(),
         preferences: Joi.object().keys({
            private: Joi.object().required()
         })
      }
   },
   updateTeamRoom: {
      body: {
         name: Joi.string().min(1),
         purpose: Joi.string().min(1),
         publish: Joi.boolean(),
         active: Joi.boolean(),
         preferences: Joi.object().keys({
            private: Joi.object()
         })
      }
   },
   inviteTeamRoomMembers: {
      body: {
         userIds: Joi.array().min(1).items(
            Joi.string().min(1).required()
         ).required()
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


// Index in the array is the version number to validate against.
export const apiVersionedValidators = {
   registerUser: [
      validate(validationSchemas.registerUser),
      validate(validationSchemas.registerUser)
   ],
   createUser: [
      validate(validationSchemas.createUser),
      validate(validationSchemas.createUser)
   ],
   updateUser: [
      validate(validationSchemas.updateUser),
      validate(validationSchemas.updateUser)
   ],
   updateUserPublicPreferences: [
      validate(validationSchemas.updateUserPublicPreferences),
      validate(validationSchemas.updateUserPublicPreferences)
   ],
   login: [
      validate(validationSchemas.login),
      validate(validationSchemas.login)
   ],
   createSubscriberOrg: [
      validate(validationSchemas.createSubscriberOrg),
      validate(validationSchemas.createSubscriberOrg)
   ],
   updateSubscriberOrg: [
      validate(validationSchemas.updateSubscriberOrg),
      validate(validationSchemas.updateSubscriberOrg)
   ],
   inviteSubscribers: [
      validate(validationSchemas.inviteSubscribers),
      validate(validationSchemas.inviteSubscribers)
   ],
   replyToInvite: [
      validate(validationSchemas.replyToInvite),
      validate(validationSchemas.replyToInvite)
   ],
   createTeam: [
      validate(validationSchemas.createTeam),
      validate(validationSchemas.createTeam)
   ],
   updateTeam: [
      validate(validationSchemas.updateTeam),
      validate(validationSchemas.updateTeam)
   ],
   inviteTeamMembers: [
      validate(validationSchemas.inviteTeamMembers),
      validate(validationSchemas.inviteTeamMembers)
   ],
   createTeamRoom: [
      validate(validationSchemas.createTeamRoom),
      validate(validationSchemas.createTeamRoom)
   ],
   updateTeamRoom: [
      validate(validationSchemas.updateTeamRoom),
      validate(validationSchemas.updateTeamRoom)
   ],
   inviteTeamRoomMembers: [
      validate(validationSchemas.inviteTeamRoomMembers),
      validate(validationSchemas.inviteTeamRoomMembers)
   ],
   createMessage: [
      validate(validationSchemas.createMessage),
      validate(validationSchemas.createMessage)
   ]
};

class ApiValidator {
   validators;

   constructor(validators) {
      this.validators = validators;
   }

   doValidation(req, res, next) {
      this.validators[req.apiVersion](req, res, next);
   }
}

export function validateByApiVersion(validators) {
   const apiValidator = new ApiValidator(validators);
   return apiValidator.doValidation.bind(apiValidator);
}
