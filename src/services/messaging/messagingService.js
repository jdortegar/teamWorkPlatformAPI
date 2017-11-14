import SocketIO from 'socket.io';
import socketioJwt from 'socketio-jwt';
import SocketIORedisAdapter from 'socket.io-redis';
import SocketIOWildcard from 'socketio-wildcard';
import config from '../../config/env';
import * as conversationSvc from '../conversationService';
import logger, { createPseudoRequest } from '../../logger';
import { setPresence } from './presence';
import {
   getSubscriberUsersByUserIds,
   getTeamMembersByUserIds,
   getTeamRoomMembersByUserIds
} from '../../repositories/util';
import { disconnectFromRedis } from '../../redis-connection';
import Roles from '../roles';


export const EventTypes = Object.freeze({
   presenceChanged: 'presenceChanged',
   userInvited: 'userInvited',
   userCreated: 'userCreated',
   userUpdated: 'userUpdated',
   userPrivateInfoUpdated: 'userPrivateInfoUpdated',

   subscriberOrgCreated: 'subscriberOrgCreated',
   subscriberOrgUpdated: 'subscriberOrgUpdated',
   subscriberOrgPrivateInfoUpdated: 'subscriberOrgPrivateInfoUpdated',
   subscriberAdded: 'subscriberAdded',

   teamCreated: 'teamCreated',
   teamUpdated: 'teamUpdated',
   teamPrivateInfoUpdated: 'teamPrivateInfoUpdated',
   teamMemberAdded: 'teamMemberAdded',

   teamRoomCreated: 'teamRoomCreated',
   teamRoomUpdated: 'teamRoomUpdated',
   teamRoomPrivateInfoUpdated: 'teamRoomPrivateInfoUpdated',
   teamRoomMemberAdded: 'teamRoomMemberAdded',

   conversationCreated: 'conversationCreated',
   conversationUpdated: 'conversationUpdated',
   messageCreated: 'messageCreated',

   typing: 'typing',
   location: 'location',

   integrationsUpdated: 'integrationsUpdated',
   boxWebhookEvent: 'boxWebhookEvent',
   googleWebhookEvent: 'googleWebhookEvent',

   from(value) { return (this[value]); }
});

export class ChannelFactory {
   static publicChannel() {
      return 'public';
   }

   static personalChannel(userId) {
      return `userId=${userId}`;
   }

   static subscriberOrgChannel(subscriberOrgId) {
      return `subscriberOrgId=${subscriberOrgId}`;
   }

   static subscriberOrgAdminChannel(subscriberOrgId) {
      return `admin.subscriberOrgId=${subscriberOrgId}`;
   }

   static teamChannel(teamId) {
      return `teamId=${teamId}`;
   }

   static teamAdminChannel(teamId) {
      return `admin.teamId=${teamId}`;
   }

   static teamRoomChannel(teamRoomId) {
      return `teamRoomId=${teamRoomId}`;
   }

   static teamRoomAdminChannel(teamRoomId) {
      return `admin.teamRoomId=${teamRoomId}`;
   }

   static conversationChannel(conversationId) {
      return `conversationId=${conversationId}`;
   }
}

export const PresenceStatuses = Object.freeze({
   available: 'available',
   away: 'away',
   from(value) { return (this[value]); }
});


const joinCurrentChannels = (req, socket, userId) => {
   const publicChannel = ChannelFactory.publicChannel();
   socket.join(publicChannel);
   logger.debug(`MessagingService: userId=${userId} joining ${publicChannel}`);

   const personalChannel = ChannelFactory.personalChannel(userId);
   socket.join(personalChannel);
   logger.debug(`MessagingService: userId=${userId} joining ${personalChannel}`);

   // Get subscribers/members instead of subscriberOrgs/teams/teamRooms, as we need the role also.

   getSubscriberUsersByUserIds(req, [userId])
      .then((subscribers) => {
         subscribers.forEach((subscriber) => {
            const { subscriberOrgId, role } = subscriber.subscriberUserInfo;

            const subscriberOrgChannel = ChannelFactory.subscriberOrgChannel(subscriberOrgId);
            socket.join(subscriberOrgChannel);
            logger.debug(`MessagingService: userId=${userId} joining ${subscriberOrgChannel}`);

            if (role === Roles.admin) {
               const subscriberOrgPrivateChannel = ChannelFactory.subscriberOrgAdminChannel(subscriberOrgId);
               socket.join(subscriberOrgPrivateChannel);
               logger.debug(`MessagingService: userId=${userId} joining ${subscriberOrgPrivateChannel}`);
            }
         });
      })
      .catch(err => logger.error(err));

   getTeamMembersByUserIds(req, [userId])
      .then((teamMembers) => {
         teamMembers.forEach((teamMember) => {
            const { teamId, role } = teamMember.teamMemberInfo;

            const teamChannel = ChannelFactory.teamChannel(teamId);
            socket.join(teamChannel);
            logger.debug(`MessagingService: userId=${userId} joining ${teamChannel}`);

            if (role === Roles.admin) {
               const teamPrivateChannel = ChannelFactory.teamAdminChannel(teamId);
               socket.join(teamPrivateChannel);
               logger.debug(`MessagingService: userId=${userId} joining ${teamPrivateChannel}`);
            }
         });
      })
      .catch(err => logger.error(err));

   getTeamRoomMembersByUserIds(req, [userId])
      .then((teamRoomMembers) => {
         teamRoomMembers.forEach((teamRoomMember) => {
            const { teamRoomId, role } = teamRoomMember.teamRoomMemberInfo;

            const teamRoomChannel = ChannelFactory.teamRoomChannel(teamRoomId);
            socket.join(teamRoomChannel);
            logger.debug(`MessagingService: userId=${userId} joining ${teamRoomChannel}`);

            if (role === Roles.admin) {
               const teamRoomPrivateChannel = ChannelFactory.teamRoomAdminChannel(teamRoomId);
               socket.join(teamRoomPrivateChannel);
               logger.debug(`MessagingService: userId=${userId} joining ${teamRoomPrivateChannel}`);
            }
         });
      })
      .catch(err => logger.error(err));

   conversationSvc.getConversations(req, userId)
      .then((conversations) => {
         const conversationIds = conversations.map(conversation => conversation.conversationId);
         conversationIds.forEach((conversationId) => {
            const conversationChannel = ChannelFactory.conversationChannel(conversationId);
            socket.join(conversationChannel);
            logger.debug(`MessagingService: userId=${userId} joining ${conversationChannel}`);
         });
      })
      .catch(err => logger.error(err));
};


class MessagingService {
   httpServer;
   io;

   // TODO: remove this.  We ain't using it.
   socketsBySocketId = {};
   socketsByUserId = {};

   init(httpServer, redisClient) {
      this.httpServer = httpServer;
      this.io = new SocketIO(this.httpServer);
      // const redisAdapter = new SocketIORedisAdapter({ host: config.cacheServer, port: config.cachePort });
      const redisAdapter = new SocketIORedisAdapter({ pubClient: redisClient.duplicate(), subClient: redisClient.duplicate() });
      this.io.adapter(redisAdapter);
      this.io.use(new SocketIOWildcard());
      this.io.origins('*:*'); // This should match cors setting in express.js.  Should be a variable.

      // Set socket.io listeners.
      this.io
         .on('connection', socketioJwt.authorize({
            secret: config.jwtSecret,
            timeout: 15000, // 15 seconds to send the authentication message.
            callback: false
         }))
         .on('authenticated', (socket) => {
            this._connected(socket);

            socket.on('message', (eventType, event) => {
               this._message(socket, eventType, event);
            });

            socket.on('disconnect', (reason) => {
               this._disconnected(socket, reason);
            });

            // Called just before 'disconnect', so no reason to listen for this.
            // socket.on('disconnecting', (reason) => {
            // });

            socket.on('error', (error) => {
               logger.error(`MessagingService error. ${error}`);
            });
         });
   }

   close() {
      if (this.io) {
         return new Promise((resolve, reject) => {
            this.io.close(() => {
               const redisAdapter = this.io.adapter();
               Promise.all([
                  disconnectFromRedis(redisAdapter.pubClient),
                  disconnectFromRedis(redisAdapter.subClient)
               ])
                  .then(() => resolve(this.httpServer))
                  .catch(err => reject(err));
            });
         });
      }
      return Promise.resolve();
   }


   _connected(socket) {
      this.socketsBySocketId[socket.id] = socket;
      this.socketsByUserId[socket.decoded_token._id] = socket;

      const userId = socket.decoded_token._id;
      const address = socket.client.conn.remoteAddress;
      const userAgent = socket.client.request.headers['user-agent'];
      const location = undefined;
      logger.debug(`MessagingService: User connected. sId=${socket.id} userId=${userId} ${socket.decoded_token.email} address=${address} userAgent=${userAgent}`);

      const req = createPseudoRequest();
      joinCurrentChannels(req, socket, userId);
      this._presenceChanged(req, userId, address, userAgent, location, PresenceStatuses.available);
   }

   _disconnected(socket, reason) {
      delete this.socketsBySocketId[socket.id];
      delete this.socketsByUserId[socket.decoded_token._id];

      const userId = socket.decoded_token._id;
      const address = socket.client.conn.remoteAddress;
      const userAgent = socket.client.request.headers['user-agent'];
      const location = undefined;
      logger.debug(`MessagingService: User disconnected. sId=${socket.id} userId=${userId} ${socket.decoded_token.email} address=${address} userAgent=${userAgent} (${reason})`);

      const req = createPseudoRequest();
      this._presenceChanged(req, userId, address, userAgent, location, PresenceStatuses.away);
   }

   _presenceChanged(req, userId, address, userAgent, location, presenceStatus, presenceMessage = undefined) {
      // Use a separate module for presence.js.
      // TODO: expiration?
      // TODO: Delete from redis if (presenceStatus === away).  Store/update, otherwise.  Don't override location if undefined.
      // TODO: presence only for orgs of user.
      const presence = { userId, address, userAgent, location, presenceStatus, presenceMessage };
      Promise.all([
         this._broadcastEvent(req, EventTypes.presenceChanged, presence),
         setPresence(req, userId, presence)
      ])
         .catch(err => logger.error(err));
   }

   _message(socket, eventType, event) {
      if (eventType === EventTypes.typing) {
         const conversationId = event.conversationId;
         if (conversationId) {
            const userId = socket.decoded_token._id;
            const channel = ChannelFactory.conversationChannel(conversationId);
            socket.to(channel).emit(eventType, { userId, conversationId, isTyping: event.isTyping });
         }
      } else if (eventType === EventTypes.location) {
         const { lat, lon, alt, accuracy } = event;
         if ((lat) && (lon)) {
            const req = createPseudoRequest();
            const userId = socket.decoded_token._id;
            const address = socket.client.conn.remoteAddress;
            const userAgent = socket.client.request.headers['user-agent'];
            const location = { lat, lon, alt, accuracy };
            this._presenceChanged(req, userId, address, userAgent, location, PresenceStatuses.available);
            // broadcast.
         }
      } else {
         logger.warn(`MessagingService: Dropping Message received from sId=${socket.id} userId=${socket.decoded_token._id} ${socket.decoded_token.email}. eventType=${eventType},
            event=${event}`);
      }
   }


   _broadcastEvent(req, eventType, event, channels = undefined) {
      return new Promise((resolve) => {
         if (channels) {
            channels.forEach((channel) => {
               this.io.in(channel).emit(eventType, event);
            });
         } else {
            this.io.emit(eventType, event);
         }
         const channelsString = (channels) ? `, channels="${JSON.stringify(channels)}"` : '';
         logger.debug(`MessagingService.broadcastEvent(eventType=${eventType}, event=${JSON.stringify(event)})${channelsString}`);
         resolve();
      });
   }

   _joinChannels(req, userId, channels) {
      return new Promise((resolve) => {
         this.io.of('/').adapter.clients([ChannelFactory.personalChannel(userId)], (err, clientIds) => {
            if (err) {
               logger.error(err);
               resolve(err);
            } else if ((clientIds === undefined) || (clientIds === null) || (clientIds.length === 0)) {
               resolve();
            } else {
               const errors = [];
               clientIds.forEach((clientId) => {
                  channels.forEach((channel) => {
                     this.io.of('/').adapter.remoteJoin(clientId, channel, (err2) => {
                        if (err2) {
                           logger.error(err2);
                           errors.push(err2);
                        } else {
                           logger.debug(`MessagingService: userId=${userId} joining ${channel}`);
                        }
                     });
                  });
               });
               resolve((errors.length > 0) ? errors : undefined);
            }
         });
      });
   }

   _leaveChannels(req, userId, channels) {
      return new Promise((resolve) => {
         this.io.of('/').adapter.clients([ChannelFactory.personalChannel(userId)], (err, clientIds) => {
            if (err) {
               logger.error(err);
               resolve(err);
            } else if ((clientIds === undefined) || (clientIds === null) || (clientIds.length === 0)) {
               resolve();
            } else {
               const errors = [];
               clientIds.forEach((clientId) => {
                  channels.forEach((channel) => {
                     this.io.of('/').adapter.remoteLeave(clientId, channel, (err2) => {
                        if (err2) {
                           logger.error(err2);
                           errors.push(err2);
                        } else {
                           logger.debug(`MessagingService: userId=${userId} leaving ${channel}`);
                        }
                     });
                  });
               });
               resolve((errors.length > 0) ? errors : undefined);
            }
         });
      });
   }
}
const messagingService = new MessagingService();
export default messagingService;


// export const _presenceChanged = (req, userId, address, userAgent, location, presenceStatus, presenceMessage = undefined) => {
//    messagingService._presenceChanged(req, userId, address, userAgent, location, presenceStatus, presenceMessage);
// };

export const _broadcastEvent = (req, eventType, event, channels = undefined) => {
   messagingService._broadcastEvent(req, eventType, event, channels);
};

export const _joinChannels = (req, userId, channels) => {
   return messagingService._joinChannels(req, userId, channels);
};

export const _leaveChannels = (req, userId, channels) => {
   messagingService._leaveChannels(req, userId, channels);
};

