export class UserNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, UserNotExistError);
   }
}

export class NoPermissionsError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, NoPermissionsError);
   }
}

export class SubscriberOrgExistsError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, SubscriberOrgExistsError);
   }
}

export class SubscriberOrgNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, SubscriberOrgNotExistError);
   }
}

export class TeamExistsError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, TeamExistsError);
   }
}

export class TeamNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, TeamNotExistError);
   }
}

export class TeamRoomExistsError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, TeamRoomExistsError);
   }
}

export class TeamRoomNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, TeamRoomNotExistError);
   }
}

export class CannotDeactivateError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, CannotDeactivateError);
   }
}

export class ConversationNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, ConversationNotExistError);
   }
}

export class MessageNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, MessageNotExistError);
   }
}

export class NotActiveError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, NotActiveError);
   }
}

export class InvitationNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, InvitationNotExistError);
   }
}

export class CannotInviteError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, CannotInviteError);
   }
}

export class IntegrationAccessError extends Error {
   _subscriberOrgId;
   _chainedError;

   constructor(subscriberOrgId, ...args) {
      super(...args);
      Error.captureStackTrace(this, IntegrationAccessError);
   }
}

export class InvalidAwsProductCodeError extends Error {
   constructor(awsProductCode, ...args) {
      super(awsProductCode, ...args);
      Error.captureStackTrace(this, InvalidAwsProductCodeError);
   }
}

export class CustomerExistsError extends Error {
   constructor(awsCustomerId, ...args) {
      super(awsCustomerId, ...args);
      Error.captureStackTrace(this, CustomerExistsError);
   }
}

export class CustomerNotExistError extends Error {
   constructor(awsCustomerId, ...args) {
      super(awsCustomerId, ...args);
      Error.captureStackTrace(this, CustomerNotExistError);
   }
}
