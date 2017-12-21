// {conversationId}#conversationId#messages = { messageCount, lastTimestamp, byteCount }
// {conversationId}#conversationId#parentMessageIds = [ parenetMesageId [, ...] ] (Redis SET)
// {conversationId}#conversationId#{parentMessageId} = { messageCount, lastTimestamp }

import config from '../../config/env';

export const getRecursiveMessageCountAndLastTimestampByConversationId = (req, conversationId) => {
   return new Promise((resolve, reject) => {
      let ret;
      req.app.locals.redis.hmgetAsync(`${config.redisPrefix}${conversationId}#conversationId#messages`, 'messageCount', 'lastTimestamp', 'byteCount')
         .then((values) => {
            if (values[0] === null) {
               return undefined;
            }

            ret = {
               conversationId,
               messageCount: values[0],
               lastTimestamp: values[1],
               byteCount: values[2]
            };

            return req.app.locals.redis.smembersAsync(`${config.redisPrefix}${conversationId}#conversationId#parentMessageIds`);
         })
         .then((parentMessageIds) => {
            if (parentMessageIds === undefined) {
               return undefined;
            }

            const promises = [];
            parentMessageIds.forEach((parentMessageId) => {
               promises.push(req.app.locals.redis.hmgetAsync(`${config.redisPrefix}${conversationId}#conversationId#${parentMessageId}`, 'messageCount', 'lastTimestamp')
                  .then((values) => {
                     ret[parentMessageId] = {
                        messageCount: values[0],
                        lastTimestamp: values[1]
                     };
                  })
               );
            });
            return Promise.all(promises);
         })
         .then(() => resolve(ret))
         .catch(err => reject(err));
   });
};

export const incrementMessageCountAndLastTimestampAndByteCount = (req, lastTimestamp, byteCount, conversationId, parentMessageId = undefined) => {
   return new Promise((resolve, reject) => {
      const messagesHashKey = `${config.redisPrefix}${conversationId}#conversationId#messages`;
      let hashKey = messagesHashKey;
      if (parentMessageId) {
         hashKey = `${config.redisPrefix}${conversationId}#conversationId#${parentMessageId}`;
      }

      req.app.locals.redis.hsetAsync(hashKey, 'lastTimestamp', lastTimestamp)
         .then((created) => {
            const promises = [];
            if ((parentMessageId) && (created === 1)) {
               const parentsHashKey = `${config.redisPrefix}${conversationId}#conversationId#parentMessageIds`;
               promises.push(req.app.locals.redis.saddAsync(parentsHashKey, parentMessageId));
            }
            promises.push(req.app.locals.redis.hincrbyAsync(hashKey, 'messageCount', 1));
            promises.push(req.app.locals.redis.hincrbyAsync(messagesHashKey, 'byteCount', byteCount));
            return Promise.all(promises);
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

export const setMessageCountAndLastTimestampAndByteCountIfNotExist = (req, messageCount, lastTimestamp, byteCount, conversationId, parentMessageId = undefined) => {
   return new Promise((resolve, reject) => {
      let isNew = false;
      const messagesHashKey = `${config.redisPrefix}${conversationId}#conversationId#messages`;
      let hashKey = messagesHashKey;
      if (parentMessageId) {
         hashKey = `${config.redisPrefix}${conversationId}#conversationId#${parentMessageId}`;
      }

      req.app.locals.redis.hexistsAsync(hashKey, 'messageCount')
         .then((exists) => {
            if (exists === 0) {
               isNew = true;
               const promises = [
                  req.app.locals.redis.hmsetAsync(hashKey,
                     'messageCount', messageCount,
                     'lastTimestamp', lastTimestamp,
                     'byteCount', byteCount),
                  req.app.locals.redis.hincrbyAsync(messagesHashKey, 'byteCount', byteCount)
               ];

               if (parentMessageId) {
                  const parentsHashKey = `${config.redisPrefix}${conversationId}#conversationId#parentMessageIds}`;
                  promises.push(req.app.locals.redis.saddAsync(parentsHashKey, parentMessageId));
               }

               return Promise.all(promises);
            }
            return undefined;
         })
         .then(() => resolve(isNew))
         .catch(err => reject(err));
   });
};
