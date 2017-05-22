import IO from 'socket.io-client';
import SocketIOWildcard from 'socketio-wildcard';

export default class Messaging {
   url;
   socket;
   listener;

   constructor(url) {
      this.url = url;
   }

   set eventListener(listener) {
      this.listener = listener;
   }

   connect(jwt) {
      this.close(); // If connection exists, close it.

      return new Promise((resolve, reject) => {
         this.socket = new IO(this.url);
         const wildcardPatch = new SocketIOWildcard(IO.Manager);
         wildcardPatch(this.socket);

         this.socket.on('connect', () => {
            console.log('Messaging connected.');
            this.socket.emit('authenticate', { token: jwt })
            .on('authenticated', () => {
               console.log(`${new Date()} Messaging authenticated.`);

               this.socket.on('reconnect', (attemptNumber) => {
                  console.log('Messaging reconnect: attemptNumber=${attemptNumber');
               });
               this.socket.on('connect_error', (err) => {
                  console.log(`${new Date()} Messaging connect_error: ${JSON.stringify(err)}`);
                  //this.socket.open();
               });
               this.socket.on('error', (err) => {
                  console.log(`Messaging error: ${JSON.stringify(err)}`);
               });
               this.socket.on('ping', () => {
                  console.log(`${new Date()} Messaging ping`);
               });
               this.socket.on('pong', (ms) => {
                  console.log(`${new Date()} Messaging pong (${ms}ms)`);
               });

               this.socket.on('*', (payload) => {
                  const eventType = payload.data[0];
                  const event = payload.data[1];
                  console.log(`Received eventType=${eventType}  event=${JSON.stringify(event)}`);
                  if (this.listener) {
                     this.listener(eventType, event);
                  }
               });
               resolve();
            })
            .on('unauthorized', (error) => {
               console.log(`Messaging unauthorized.  ${JSON.stringify(error)}`);
               reject();
            });
         });
      });
   }

   close() {
      if (this.socket) {
         this.socket.close();
         this.socket= undefined;
      }
   }
}


   //const messaging = new Messaging(config.apiEndpoint);

   // LOCAL
   //const messaging = new Messaging('http://localhost:3000');
   //const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJlYTc5NDUxMC1jZWE2LTQxMzItYWUyMi1hN2FlMWQzMmFiYjUiLCJlbWFpbCI6ImFudGhvbnkuZGFnYUBoYWJsYS5haSIsImlhdCI6MTQ5Mjk4OTM3N30.8f9ylrHqIlQyOKsAqeKIimDrrvChwP_V5ueBS0DNzxU';

   // DEV
   const messaging = new Messaging('https://habla-fe-api-dev.habla.ai');
   const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJlYTc5NDUxMC1jZWE2LTQxMzItYWUyMi1hN2FlMWQzMmFiYjUiLCJlbWFpbCI6ImFudGhvbnkuZGFnYUBoYWJsYS5haSIsImlhdCI6MTQ5MzI1NjQyNH0.KZoA9IGiaViWbBofMGaA_Q7AuOqruz9YxpWRL4QNJus';

   messaging.connect(jwt);
   //messaging.send('Hello from client');
   //messaging.close();
