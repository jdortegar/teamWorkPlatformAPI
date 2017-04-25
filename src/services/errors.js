export class ConversationNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, ConversationNotExistError);
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

export class TeamNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, TeamNotExistError);
   }
}

export class TeamRoomNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, TeamRoomNotExistError);
   }
}

export class UserNotExistError extends Error {
   constructor(...args) {
      super(...args);
      Error.captureStackTrace(this, UserNotExistError);
   }
}
