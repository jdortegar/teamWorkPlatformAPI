import app from '../../config/express';
import logger from '../../logger';

const outgoingIntegrationQueue = 'integration#ai';
const incomingIntegrationQueue = 'integration#api';

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
   redisClient.brpop(incomingIntegrationQueue, 0, (err, response) => {
      if (err) {
         logger.error('Integration event error', err);
      } else if (response) {
         // TODO: If expired Oauth 2 access token, ask for another.
         logger.info('Integration event received.', event);
      } else {
         logger.debug('No integration event received.');
      }
      //listenForInternalEvents();
   });
}
