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
         icon: Joi.string().base64().allow(null),
         preferences: Joi.object().keys({
            iconColor: Joi.string().min(1),
            private: Joi.object().required()
         })
      }
   },
   updateSubscriberOrg: {
      body: {
         name: Joi.string().min(1),
         icon: Joi.string().base64().allow(null),
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
         icon: Joi.string().base64().allow(null),
         preferences: Joi.object().keys({
            iconColor: Joi.string().min(1),
            private: Joi.object().required()
         })
      }
   },
   updateTeam: {
      body: {
         name: Joi.string().min(1),
         active: Joi.boolean(),
         icon: Joi.string().base64().allow(null),
         preferences: Joi.object().keys({
            iconColor: Joi.string().min(1),
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
         icon: Joi.string().base64().allow(null),
         preferences: Joi.object().keys({
            iconColor: Joi.string().min(1),
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
         icon: Joi.string().base64().allow(null),
         preferences: Joi.object().keys({
            iconColor: Joi.string().min(1),
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
   },
   createMessage_v1: {
      body: {
         content: Joi.array().min(1).items(
            Joi.object().keys({
               type: Joi.string().min(1).required(),
               text: Joi.string().min(1),
               resourceId: Joi.string().min(1),
               meta: Joi.object().keys({
                  fileName: Joi.string().min(1)
               })
            })
         ).required(),
         replyTo: Joi.string().min(1).allow(null)
      }
   }
};


// Index in the array is the version number to validate against.
export const apiVersionedValidators = {
   registerUser: {
      0: validate(validationSchemas.registerUser),
      1: validate(validationSchemas.registerUser)
   },
   createUser: {
      0: validate(validationSchemas.createUser),
      1: validate(validationSchemas.createUser)
   },
   updateUser: {
      0: validate(validationSchemas.updateUser),
      1: validate(validationSchemas.updateUser)
   },
   updateUserPublicPreferences: {
      0: validate(validationSchemas.updateUserPublicPreferences),
      1: validate(validationSchemas.updateUserPublicPreferences)
   },
   login: {
      0: validate(validationSchemas.login),
      1: validate(validationSchemas.login)
   },
   createSubscriberOrg: {
      0: validate(validationSchemas.createSubscriberOrg),
      1: validate(validationSchemas.createSubscriberOrg)
   },
   updateSubscriberOrg: {
      0: validate(validationSchemas.updateSubscriberOrg),
      1: validate(validationSchemas.updateSubscriberOrg)
   },
   inviteSubscribers: {
      0: validate(validationSchemas.inviteSubscribers),
      1: validate(validationSchemas.inviteSubscribers)
   },
   replyToInvite: {
      0: validate(validationSchemas.replyToInvite),
      1: validate(validationSchemas.replyToInvite)
   },
   createTeam: {
      0: validate(validationSchemas.createTeam),
      1: validate(validationSchemas.createTeam)
   },
   updateTeam: {
      0: validate(validationSchemas.updateTeam),
      1: validate(validationSchemas.updateTeam)
   },
   inviteTeamMembers: {
      0: validate(validationSchemas.inviteTeamMembers),
      1: validate(validationSchemas.inviteTeamMembers)
   },
   createTeamRoom: {
      0: validate(validationSchemas.createTeamRoom),
      1: validate(validationSchemas.createTeamRoom)
   },
   updateTeamRoom: {
      0: validate(validationSchemas.updateTeamRoom),
      1: validate(validationSchemas.updateTeamRoom)
   },
   inviteTeamRoomMembers: {
      0: validate(validationSchemas.inviteTeamRoomMembers),
      1: validate(validationSchemas.inviteTeamRoomMembers)
   },
   createMessage: {
      0: validate(validationSchemas.createMessage),
      1: validate(validationSchemas.createMessage_v1)
   }
};

class ApiValidator {
   validators;

   constructor(validators) {
      this.validators = validators;
   }

   doValidation(req, res, next) {
      this.validators[req.apiVersion.toString()](req, res, next);
   }
}

export function validateByApiVersion(validators) {
   const apiValidator = new ApiValidator(validators);
   return apiValidator.doValidation.bind(apiValidator);
}
