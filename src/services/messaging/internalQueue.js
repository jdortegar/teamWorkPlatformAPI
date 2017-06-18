import app from '../../config/express';
import { boxIntegrationExpired, googleIntegrationExpired } from './index';
import logger from '../../logger';

const outgoingIntegrationQueue = 'integration#ai';
const incomingIntegrationQueue = 'integration#api';

let listen = false;
let stoppedCallback;

export function sendEvent(req, eventType, event) { // eslint-disable-line import/prefer-default-export
   const redisClient = app.locals.redis;
   const message = { eventType, event };
   const messageString = JSON.stringify(message);

   redisClient.lpushAsync(outgoingIntegrationQueue, messageString)
      .then(() => {
         req.logger.info(`Sent integration message: ${messageString}`);
      })
      .catch((err) => {
         req.logger.error(err, message);
      });
}

export function listenForInternalEvents() {
   const redisClient = app.locals.redis;
   redisClient.brpop(incomingIntegrationQueue, 5, (err, response) => {
      if (err) {
         logger.error('Integration event error', err);
      } else if (response) {
         logger.info('Integration event received.', event);

         // TODO: If expired Oauth 2 access token, ask for another, email and event: boxIntegrationExpired, googleIntegrationExpired.
      } else {
         logger.silly('No integration event received.');
      }

      if (listen) {
         listenForInternalEvents();
      } else if (stoppedCallback) {
         logger.info('Stopped listening for internal events.');
         stoppedCallback();
      }
   });

   if (listen === false) {
      logger.info('Listening for internal events.');
      listen = true;
   }
}

export function stopListeningForInternalEvents() {
   if (listen) {
      return new Promise((resolve) => {
         stoppedCallback = resolve;
         listen = false;
      });
   }

   return Promise.resolve();
}
