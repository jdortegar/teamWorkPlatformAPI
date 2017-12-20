// {conversationId}#conversationId#messages = { messageCount, lastTimestamp }
// {conversationId}#conversationId#parentMessageIds = [ parenetMesageId [, ...] ] (Redis SET)
// {conversationId}#conversationId#{parentMessageId} = { messageCount, lastTimestamp }

export const getRecursiveMessageCountAndLastTimestampByConversationId = (req, conversationId) => {
   return new Promise((resolve, reject) => {
      let ret;
      req.app.locals.redis.hmgetAsync(`${conversationId}#onversationId#messages`, 'messageCount', 'lastTimestamp')
         .then((values) => {
            if (values[0] === null) {
               return undefined;
            }

            ret = {
               conversationId,
               messageCount: values[0],
               lastTimestamp: values[1]
            };

            return req.app.locals.redis.smembersAsync(`${conversationId}#conversationId#parentMessageIds`);
         })
         .then((parentMessageIds) => {
            if (parentMessageIds === undefined) {
               return undefined;
            }

            const promises = [];
            parentMessageIds.forEach((parentMessageId) => {
               promises.push(req.app.locals.redis.hmgetAsync(`${conversationId}#onversationId#${parentMessageId}`, 'messageCount', 'lastTimestamp')
                  .then((values) => {
                     ret[parentMessageId] = {
                        messageCount: values[0],
                        lastTimestamp: values[1]
                     };
                  })
               );
            });
            return promises;
         })
         .then(() => resolve(ret))
         .catch(err => reject(err));
   });
};

export const incrementMessageCountAndLastTimestamp = (req, lastTimestamp, conversationId, parentMessageId = undefined) => {
   return new Promise((resolve, reject) => {
      let hashKey;
      if (parentMessageId) {
         hashKey = `${conversationId}#conversationId#${parentMessageId}`;
      } else {
         hashKey = `${conversationId}#conversationId#messages`;
      }

      req.app.locals.redis.hset(hashKey, 'lastTimestamp', lastTimestamp)
         .then(() => req.app.locals.redis.hmincrbyAsync(hashKey, 1))
         .then(() => resolve())
         .catch(err => reject(err));
   });
};

export const setMessageCountAndLastTimestampIfNotExist = (req, messageCount, lastTimestamp, conversationId, parentMessageId = undefined) => {
   return new Promise((resolve, reject) => {
      let hashKey;
      if (parentMessageId) {
         hashKey = `${conversationId}#conversationId#${parentMessageId}`;
      } else {
         hashKey = `${conversationId}#conversationId#messages`;
      }

      req.app.locals.redis.hmexistsAsync(hashKey, 'messageCount')
         .then((exists) => {
            if (exists === 0) {
               const parentsHashKey = `${conversationId}#conversationId#parentMessageIds}`;
               return Promise.all([
                  req.app.locals.redis.hmsetAsync(hashKey,
                     'messageCount', messageCount,
                     'lastTimestamp', lastTimestamp),
                  req.app.locals.redis.saddAsync(parentsHashKey, parentMessageId)
               ]);
            }
            return undefined;
         })
         .then((result) => {
            resolve((result));
         })
         .then(() => resolve())
         .catch(err => reject(err));
   });
};
