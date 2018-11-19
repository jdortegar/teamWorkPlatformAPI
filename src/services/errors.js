import NestedError from 'nested-error-stacks';

export class AppError extends NestedError {
   constructor(message = undefined, nested = undefined) {
      if (new.target === AppError) {
         throw new TypeError('Cannot construct AppError instance directly.');
      }
      super(message, nested);
   }
}

export class AppWarning extends NestedError {
   constructor(message = undefined, nested = undefined) {
      if (new.target === AppError) {
         throw new TypeError('Cannot construct AppWarning instance directly.');
      }
      super(message, nested);
   }
}

export class APIError extends AppError {
   status;
   constructor(httpStatus, nestedErrorOrMessage) {
      let msg = 'APIError';
      let nested;
      if (nestedErrorOrMessage instanceof String) {
         msg = `${msg}:${nestedErrorOrMessage}`;
      } else {
         nested = nestedErrorOrMessage;
      }
      super(msg, nested);
      this.status = httpStatus;
   }
}

export class APIWarning extends AppWarning {
   status;

   constructor(httpStatus, nestedErrorOrMessage) {
      let msg = 'APIWarning';
      let nested;
      if (nestedErrorOrMessage instanceof String) {
         msg = `${msg}:${nestedErrorOrMessage}`;
      } else {
         nested = nestedErrorOrMessage;
      }
      super(msg, nested);
      this.status = httpStatus;
   }
}

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

export class SubscriberUserExistsError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, SubscriberUserExistsError);
   }
}

export class UserLimitReached extends Error {
    constructor(userLimit, ...args) {
        super(...args);
        this.userLimit = userLimit;
        Error.captureStackTrace(this, UserLimitReached);
    }
}
export class SubscriberUserNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, SubscriberUserNotExistError);
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

export class TeamMemberExistsError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, TeamMemberExistsError);
   }
}

export class TeamMemberNotExistsError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, TeamMemberExistsError);
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

export class TeamRoomMemberExistsError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, TeamRoomMemberExistsError);
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
      this._subscriberOrgId = subscriberOrgId;
      Error.captureStackTrace(this, IntegrationAccessError);
   }
}

export class BadIntegrationConfigurationError extends Error {
   _configuration;

   constructor(configuration, ...args) {
      super(...args);
      this._configuration = configuration;
      Error.captureStackTrace(this, BadIntegrationConfigurationError);
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
