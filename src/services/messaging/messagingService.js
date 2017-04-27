import moment from 'moment';
import SocketIO from 'socket.io';
import socketioJwt from 'socketio-jwt';
import SocketIORedisAdapter from 'socket.io-redis';
import SocketIOWildcard from 'socketio-wildcard';
import config from '../../config/env';
import app from '../../config/express';
import conversationSvc from '../conversationService';


export const EventTypes = Object.freeze({
   presenceChanged: 'presenceChanged',
   userCreated: 'userCreated',
   userUpdated: 'userUpdated',
   subscriberOrgCreated: 'subscriberOrgCreated',
   subscriberOrgUpdated: 'subscriberOrgUpdated',
   teamCreated: 'teamCreated',
   teamUpdated: 'teamUpdated',
   teamRoomCreated: 'teamRoomCreated',
   teamRoomUpdated: 'teamRoomUpdated',
   messageCreated: 'messageCreated',
   from(value) { return (this[value]); }
});

export class ChannelFactory {
   static publicChannel() {
      return 'public';
   }

   static subscriberOrgChannel(subscriberOrgId) {
      return `subscriberOrgId=${subscriberOrgId}`;
   }

   static teamChannel(teamId) {
      return `teamId=${teamId}`;
   }

   static teamRoomChannel(teamRoomId) {
      return `teamRoomId=${teamRoomId}`;
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


class MessagingService {
   httpServer;
   io;
   // pingInterval = 120000; // 2 minutes.
   // pingTimeout = (this.pingInterval * 2) + 1;

   socketsBySocketId = {};
   socketsByUserId = {};

   init(httpServer) {
      this.httpServer = httpServer;
      this.io = new SocketIO(this.httpServer);
      // this.io = new SocketIO(this.httpServer, { pingInterval: this.pingInterval, pingTimeout: this.pingTimeout });
      // this.io.set('heartbeat interval', this.pingInterval);
      // this.io.set('heartbeat timeout', this.pingTimeout);
      this.io.adapter(new SocketIORedisAdapter({ host: config.cacheServer, port: config.cachePort }));
      this.io.use(new SocketIOWildcard());

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

            socket.on('error', (error) => {
               console.log(`MessagingService error. ${error}`);
            });
         });
   }

   close() {
      return new Promise((resolve) => {
         this.io.close(() => {
            resolve(this.httpServer);
         });
      });
   }


   _connected(socket) {
      this.socketsBySocketId[socket.id] = socket;
      this.socketsByUserId[socket.decoded_token._id] = socket;

      const userId = socket.decoded_token._id;
      console.log(`MessagingService: User connected. sId=${socket.id} userId=${userId} ${socket.decoded_token.email}`);

      const req = { app, now: moment.utc() };
      this._presenceChanged(req, userId, PresenceStatuses.available);
      this._joinChannels(req, socket, userId);
   }

   _disconnected(socket, reason) {
      delete this.socketsBySocketId[socket.id];
      delete this.socketsByUserId[socket.decoded_token._id];
      const userId = socket.decoded_token._id;
      console.log(`MessagingService: User disconnected. sId=${socket.id} userId=${userId} ${socket.decoded_token.email} (${reason})`);
      this._presenceChanged(undefined, userId, PresenceStatuses.away);
   }

   // TODO: maintain 'from' or count, just in case the same user is connected via multiple clients.
   _presenceChanged(req, userId, presenceStatus, presenceMessage = undefined) {
      this.broadcastEvent(req, EventTypes.presenceChanged, { userId, presenceStatus, presenceMessage });
   }

   _joinChannels(req, socket, userId) {
      const publicChannel = ChannelFactory.publicChannel();
      socket.join(publicChannel);
      console.log(`MessagingService: userId=${userId} joining ${publicChannel}`);

      conversationSvc.getConversations(req, userId)
         .then((conversations) => {
            const conversationIds = conversations.map(conversation => conversation.conversationId);
            conversationIds.forEach((conversationId) => {
               const conversationChannel = ChannelFactory.conversationChannel(conversationId);
               socket.join(conversationChannel);
               console.log(`MessagingService: userId=${userId} joining ${conversationChannel}`);
            });
         })
         .catch(err => console.error(err));
   }

   _message(socket, eventType, event) {
      // Drop this on the floor.
      console.warn(`MessagingService: Message received from sId=${socket.id} userId=${socket.decoded_token._id} ${socket.decoded_token.email}. eventType=${eventType}, event=${event}`);
   }


   broadcastEvent(req, eventType, event, channels = undefined) {
      if (channels) {
         channels.forEach((channel) => {
            this.io.to(channel).emit(eventType, event);
         });
      } else {
         this.io.emit(eventType, event);
      }
      const channelsString = (channels) ? `, channels="${channels}"` : '';
      console.log(`MessagingService.broadcastEvent(eventType=${eventType}, event=${JSON.stringify(event)})${channelsString}`);
   }
}
const messagingService = new MessagingService();
export default messagingService;
