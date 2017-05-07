import moment from 'moment';
import SocketIO from 'socket.io';
import socketioJwt from 'socketio-jwt';
import SocketIORedisAdapter from 'socket.io-redis';
import SocketIOWildcard from 'socketio-wildcard';
import config from '../../config/env';
import app from '../../config/express';
import conversationSvc from '../conversationService';
import teamRoomSvc from '../teamRoomService';
import teamSvc from '../teamService';
import subscriberOrgSvc from '../subscriberOrgService';


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
   subscriberRemoved: 'subscriberRemoved',
   teamCreated: 'teamCreated',
   teamUpdated: 'teamUpdated',
   teamPrivateInfoUpdated: 'teamPrivateInfoUpdated',
   teamMemberAdded: 'teamMemberAdded',
   teamMemberRemoved: 'teamMemberRemoved',
   teamRoomCreated: 'teamRoomCreated',
   teamRoomUpdated: 'teamRoomUpdated',
   teamRoomPrivateInfoUpdated: 'teamRoomPrivateInfoUpdated',
   teamRoomMemberAdded: 'teamRoomMemberAdded',
   teamRoomMemberRemoved: 'teamRoomMemberRemoved',
   conversationCreated: 'conversationCreated',
   conversationUpdated: 'conversationUpdated',
   messageCreated: 'messageCreated',
   typing: 'typing',
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
      const redisAdapter = new SocketIORedisAdapter({ host: config.cacheServer, port: config.cachePort });
      this.io.adapter(redisAdapter);
      this.io.use(new SocketIOWildcard());

      // Set socket.io listeners.
      this.io
         .on('connection', socketioJwt.authorize({
            secret: config.jwtSecret,
            timeout: 15000, // 15 seconds to send the authentication message.
            callback: false
         }))
         .on('authenticated', (socket) => {
            console.log('\nAD: authenticated');
            this._connected(socket);

            socket.on('message', (eventType, event) => {
               console.log('\nAD: message');
               this._message(socket, eventType, event);
            });

            socket.on('disconnect', (reason) => {
               console.log(`\nAD: disconnect: ${reason}`);
               this._disconnected(socket, reason);
            });

            socket.on('disconnecting', (reason) => {
               console.log(`\nAD: disconnecting: ${reason}`);
            });

            socket.on('error', (error) => {
               console.log('\nAD: error');
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

      console.log(`AD: TODO: use this to deduce client type:  address=${socket.client.conn.remoteAddress}, user-agent=${socket.client.request.headers['user-agent']}`);
      const req = { app, now: moment.utc() };
      this._joinCurrentChannels(req, socket, userId);
      this._presenceChanged(req, userId, PresenceStatuses.available);
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
      return this._broadcastEvent(req, EventTypes.presenceChanged, { userId, presenceStatus, presenceMessage });
   }

   _joinCurrentChannels(req, socket, userId) {
      const publicChannel = ChannelFactory.publicChannel();
      socket.join(publicChannel);
      console.log(`MessagingService: userId=${userId} joining ${publicChannel}`);

      const personalChannel = ChannelFactory.personalChannel(userId);
      socket.join(personalChannel);
      console.log(`MessagingService: userId=${userId} joining ${personalChannel}`);

      subscriberOrgSvc.getUserSubscriberOrgs(req, userId)
         .then((subscriberOrgs) => {
            const subscriberOrgIds = subscriberOrgs.map(subscriberOrg => subscriberOrg.subscriberOrgId);
            subscriberOrgIds.forEach((subscriberOrgId) => {
               const subscriberOrgChannel = ChannelFactory.subscriberOrgChannel(subscriberOrgId);
               socket.join(subscriberOrgChannel);
               console.log(`MessagingService: userId=${userId} joining ${subscriberOrgChannel}`);

               const subscriberOrgPrivateChannel = ChannelFactory.subscriberOrgAdminChannel(subscriberOrgId);
               socket.join(subscriberOrgPrivateChannel);
               console.log(`MessagingService: userId=${userId} joining ${subscriberOrgPrivateChannel}`);
            });
         })
         .catch(err => console.error(err));

      teamSvc.getUserTeams(req, userId)
         .then((teams) => {
            const teamIds = teams.map(team => team.teamId);
            teamIds.forEach((teamId) => {
               const teamChannel = ChannelFactory.teamChannel(teamId);
               socket.join(teamChannel);
               console.log(`MessagingService: userId=${userId} joining ${teamChannel}`);

               const teamPrivateChannel = ChannelFactory.teamAdminChannel(teamId);
               socket.join(teamPrivateChannel);
               console.log(`MessagingService: userId=${userId} joining ${teamPrivateChannel}`);
            });
         })
         .catch(err => console.error(err));

      teamRoomSvc.getUserTeamRooms(req, userId)
         .then((teamRooms) => {
            const teamRoomIds = teamRooms.map(teamRoom => teamRoom.teamRoomId);
            teamRoomIds.forEach((teamRoomId) => {
               const teamRoomChannel = ChannelFactory.teamRoomChannel(teamRoomId);
               socket.join(teamRoomChannel);
               console.log(`MessagingService: userId=${userId} joining ${teamRoomChannel}`);

               const teamRoomPrivateChannel = ChannelFactory.teamRoomAdminChannel(teamRoomId);
               socket.join(teamRoomPrivateChannel);
               console.log(`MessagingService: userId=${userId} joining ${teamRoomPrivateChannel}`);
            });
         })
         .catch(err => console.error(err));

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
      // Drop this on the floor.  User is trying to send a message via websockets.
      if (eventType === EventTypes.typing) {
         const conversationId = event.conversationId;
         if (conversationId) {
            const userId = socket.decoded_token._id;
            const channel = ChannelFactory.conversationChannel(conversationId);
            socket.to(channel).emit(eventType, { userId, conversationId, isTyping: event.isTyping });
         }
      } else {
         console.warn(`MessagingService: Droping Message received from sId=${socket.id} userId=${socket.decoded_token._id} ${socket.decoded_token.email}. eventType=${eventType}, event=${event}`);
      }
   }


   _broadcastEvent(req, eventType, event, channels = undefined) {
      return new Promise((resolve, reject) => {
         if (channels) {
            channels.forEach((channel) => {
               this.io.in(channel).emit(eventType, event);
            });
         } else {
            this.io.emit(eventType, event);
         }
         const channelsString = (channels) ? `, channels="${channels}"` : '';
         console.log(`MessagingService.broadcastEvent(eventType=${eventType}, event=${JSON.stringify(event)})${channelsString}`);
         resolve();
      });
   }

   _joinChannels(req, userId, channels) {
      return new Promise((resolve, reject) => {
         this.io.of('/').adapter.clients([ChannelFactory.personalChannel(userId)], (err, clientIds) => {
            if (err) {
               console.error(err);
               resolve(err);
            } else if ((clientIds === undefined) || (clientIds === null) || (clientIds.length === 0)) {
               resolve();
            } else {
               const errors = [];
               clientIds.forEach((clientId) => {
                  channels.forEach((channel) => {
                     this.io.of('/').adapter.remoteJoin(clientId, channel, (err2) => {
                        if (err2) {
                           console.error(err2);
                           errors.push(err2);
                        }
                        else {
                           console.log(`MessagingService: userId=${userId} joining ${channel}`);
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
         return new Promise((resolve, reject) => {
            this.io.of('/').adapter.clients([ChannelFactory.personalChannel(userId)], (err, clientIds) => {
               if (err) {
                  console.error(err);
                  resolve(err);
               } else if ((clientIds === undefined) || (clientIds === null) || (clientIds.length === 0)) {
                  resolve();
               } else {
                  const errors = [];
                  clientIds.forEach((clientId) => {
                     channels.forEach((channel) => {
                        this.io.of('/').adapter.remoteLeav(clientId, channel, (err2) => {
                           if (err2) {
                              console.error(err2);
                              errors.push(err2);
                           }
                           else {
                              console.log(`MessagingService: userId=${userId} leaving ${channel}`);
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


export function _presenceChanged(req, userId, presenceStatus, presenceMessage = undefined) {
   messagingService._presenceChanged(req, userId, presenceStatus, presenceMessage);
}

export function _broadcastEvent(req, eventType, event, channels = undefined) {
   messagingService._broadcastEvent(req, eventType, event, channels);
}

export function _joinChannels(req, userId, channels) {
   messagingService._joinChannels(req, userId, channels);
}

export function _leaveChannels(req, userId, channels) {
   messagingService._leaveChannels(req, userId, channels);
}
