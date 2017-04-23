import IO from 'socket.io-client';

export default class Messaging {
   socket;

   constructor(url) {
      this.socket = new IO(url);
console.log(`AD: Messaging connected to ${url}`);
      this.socket.on('connect', () => {
         console.log('Received connect');
      });
      this.socket.on('reconnect', (attemptNumber) => {
         console.log('Received reconnect: attemptNumber=${attemptNumber');
      });
      this.socket.on('connect_error', (err) => {
         console.log(`Received connect_error: ${JSON.stringify(err)}`);
         this.socket.open();
      });
      this.socket.on('error', (err) => {
         console.log(`Received error: ${JSON.stringify(err)}`);
      });

      this.socket.on('message2', (event) => {
         console.log(`Received: ${JSON.stringify(event)}`);
      });
   }

   close() {
      this.socket.close();
   }

   send(event) {
console.log(`AD: Messaging sending ${event}...`);
      this.socket.send('message2', event, (data) => {
         console.log(`AD: 1, Messaging sent ${data}`);
      });
      this.socket.emit('message2', event, (data) => {
         console.log(`AD: 2, Messaging sent ${data}`);
      });
   }
}

