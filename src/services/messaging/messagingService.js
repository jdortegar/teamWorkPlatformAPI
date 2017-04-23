import SocketIO from 'socket.io';
import SocketIORedisAdapter from 'socket.io-redis';
import config from '../../config/env';

class MessagingService {
   httpServer;
   io;

   socketsById = {};

   init(httpServer) {
      this.httpServer = httpServer;
      this.io = new SocketIO(this.httpServer);
      this.io.adapter(new SocketIORedisAdapter({ host: config.cacheServer, port: config.cachePort }));

      // Set socket.io listeners.
      this.io.on('connection', (socket) => {
         this._connected(socket);

         socket.on('message', (eventName, event) => {
            this.message(eventName, event);
         });

         socket.on('disconnect', (socket) => {
            this._disconnected(socket);
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
      console.log(`MessagingService: User connected. socket=${socket}`);
      this.socketsById[socket.id] = socket;
   }

   _disconnected(socket) {
      console.log(`MessagingService: User disconnected. socket=${socket}`);
      delete this.socketsById[socket.id];
   }

   message(eventName, event) {
      console.log(`MessagingService: Message received. eventName=${eventName}, event=${event}`);
   }


   event(req, event) {
      return new Promise((resolve, reject) => {
         this.io.emit('message2', event);
         console.log(`AD: event=${JSON.stringify(event)}`);
         resolve();
      });
   }
}
const messagingService = new MessagingService();
export default messagingService;
