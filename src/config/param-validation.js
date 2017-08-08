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

export default validationSchemas;
