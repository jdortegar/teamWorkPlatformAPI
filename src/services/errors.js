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

export class InvitationNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, InvitationNotExistError);
   }
}

export class IntegrationAccessError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, IntegrationAccessError);
   }
}
