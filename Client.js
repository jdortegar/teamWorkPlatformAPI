import axios from 'axios';
import prompt from 'prompt';
import IO from 'socket.io-client';
import SocketIOWildcard from 'socketio-wildcard';
import { EventTypes } from './src/services/messaging/MessagingService';

export default class Messaging {
   url;
   socket;
   listener;

   printPing = false;

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
               console.log('Messaging authenticated.');

               this.socket.on('reconnect', (attemptNumber) => {
                  console.log(`\n\t\t\tMessaging reconnect: attemptNumber=${attemptNumber}  [${new Date()}]`);
               });
               this.socket.on('connect_error', (err) => {
                  console.log(`\n\t\t\tMessaging connect_error: ${JSON.stringify(err)}  [${new Date()}]`);
                  //this.socket.open();
               });
               this.socket.on('error', (err) => {
                  console.log(`\n\t\t\tMessaging error: ${JSON.stringify(err)}  [${new Date()}]`);
               });
               this.socket.on('ping', () => {
                  if (this.printPing) {
                     console.log(`\n\t\t\tMessaging ping  [${new Date()}]`);
                  }
               });
               this.socket.on('pong', (ms) => {
                  if (this.printPing) {
                     console.log(`\n\t\t\tMessaging pong (${ms}ms)  [${new Date()}]`);
                  }
               });

               this.socket.on('*', (payload) => {
                  const eventType = payload.data[0];
                  const event = payload.data[1];
                  console.log(`\n\t\t\tMessaging received eventType=${eventType}  event=${JSON.stringify(event)}  [${new Date()}]`);
                  if (this.listener) {
                     this.listener(eventType, event);
                  }
               });
               resolve();
            })
            .on('unauthorized', (error) => {
               console.log(`Messaging unauthorized.  ${JSON.stringify(error)}`);
               if ((error.data.type === 'UnauthorizedError') || (error.data.code === 'invalid_token')) {
                  // redirect user to login page perhaps?
                  console.log("User's token has expired");
               }
               reject();
            });
         });
      });
   }

   typing(conversationId, isTyping) {
      this.socket.send(EventTypes.typing, { conversationId, isTyping });
   }

   printPingMessages(printPing = true) {
      this.printPing = printPing;
   }

   close() {
      if (this.socket) {
         this.socket.close();
         this.socket= undefined;
      }
   }
}


function promptCredentials() {
   return new Promise((resolve, reject) => {
      prompt.message = '';
      prompt.start();
      //prompt.get(['Username', 'Password'], (err, result) => {
      prompt.get({ properties: { Username: { required: true }, Password: { required: true, hidden: true, replace: '*' } } }, (err, result) => {
         if (err) {
            reject(err);
         }
         resolve({ username: result.Username, password: result.Password });
      });
   });
}

function login(baseUrl, username, password) {
   console.log(`login(${baseUrl}, ${username})`);
   const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
   return new Promise((resolve, reject) => {
      axios.post(`${baseUrl}/auth/login`, body, { content_type: 'application/x-www-form-urlencoded' })
         .then((response) => {
            if (response.status === 200) {
               resolve(response.data);
            } else {
               reject(response.status);
            }
         })
         .catch(err => reject(err));
   });
}

function selectChoice(promptMsg, nameVariable, idVariable, choices, allowNone = false, showIds = true) {
   console.log(`\n${promptMsg}`);

   let minChoice = 1;
   if (allowNone) {
      minChoice = 0;
      console.log('  0: None');
   }

   let idx = 1;
   let choiceDesc;
   choices.forEach((choice) => {
      choiceDesc = `  ${idx}: ${choice[nameVariable]}`;
      choiceDesc += (showIds) ? ` (${choice[idVariable]})` : '';
      console.log(choiceDesc);
      idx += 1;
   });

   return new Promise((resolve, reject) => {
      const promptVariable = 'Choice';
      prompt.get([promptVariable], (err, result) => {
         if (err) {
            reject(err);
         } else {
            const selected = Number(result[promptVariable]);
            if ((isNaN(selected)) || (selected < minChoice) || (selected > choices.length)) {
               console.log(`Selection must be between ${minChoice}-${choices.length}`);
               selectChoice(promptMsg, nameVariable, idVariable, choices)
                  .then(selected2 => resolve(selected2))
                  .catch(err2 => reject(err2));
            } else {
               if (selected === 0) {
                  resolve(undefined);
               } else {
                  resolve(choices[selected - 1]);
               }
            }
         }
      });
   });
}

function getSubscriberOrgs(baseUrl, jwt) {
   console.log('getSubscriberOrgs()');
   return new Promise((resolve, reject) => {
      axios.get(`${baseUrl}/subscriberOrgs/getSubscriberOrgs`, { headers: { Authorization: `Bearer ${jwt}` } })
         .then((response) => {
            if (response.status === 200) {
               resolve(response.data.subscriberOrgs);
            } else {
               reject(response.status);
            }
         })
         .catch(err => reject(err));
   });
}

function getSubscribers(baseUrl, jwt, subscriberOrgId) {
   console.log(`getSubscribers(subscriberOrgId=${subscriberOrgId})`);
   return new Promise((resolve, reject) => {
      axios.get(`${baseUrl}/subscriberOrgs/getSubscribers/${subscriberOrgId}`, { headers: { Authorization: `Bearer ${jwt}` } })
         .then((response) => {
            if (response.status === 200) {
               resolve(response.data.subscribers);
            } else {
               reject(response.status);
            }
         })
         .catch(err => reject(err));
   });
}

function getTeams(baseUrl, jwt, subscriberOrgId = undefined) {
   console.log(`getTeams(subscriberOrgId=${subscriberOrgId})`);
   return new Promise((resolve, reject) => {
      const query = (subscriberOrgId) ? `?subscriberOrgId=${subscriberOrgId}` : '';
      axios.get(`${baseUrl}/teams/getTeams${query}`, { headers: { Authorization: `Bearer ${jwt}` } })
         .then((response) => {
            if (response.status === 200) {
               resolve(response.data.teams);
            } else {
               reject(response.status);
            }
         })
         .catch(err => reject(err));
   });
}

function getTeamMembers(baseUrl, jwt, teamId) {
   console.log(`getTeamMembers(teamId=${teamId})`);
   return new Promise((resolve, reject) => {
      axios.get(`${baseUrl}/teams/getMembers/${teamId}`, { headers: { Authorization: `Bearer ${jwt}` } })
         .then((response) => {
            if (response.status === 200) {
               resolve(response.data.teamMembers);
            } else {
               reject(response.status);
            }
         })
         .catch(err => reject(err));
   });
}

/**
 *
 * @param baseUrl
 * @param jwt
 * @param teamId If defined, then do not define subscriberOrgId.
 * @param subscriberOrgId If defined, then do not define teamId.
 * @returns {Promise}
 */
function getTeamRooms(baseUrl, jwt, { teamId, subscriberOrgId } = {}) {
   console.log(`getTeamRooms(teamId=${teamId}, subscriberOrgId=${subscriberOrgId})`);

   return new Promise((resolve, reject) => {
      let query = '';
      if (teamId) {
         query = `?teamId=${teamId}`;
      } else if (subscriberOrgId) {
         query = `?subscriberOrgId=${subscriberOrgId}`;
      }
      axios.get(`${baseUrl}/teamRooms/getTeamRooms${query}`, { headers: { Authorization: `Bearer ${jwt}` } })
         .then((response) => {
            if (response.status === 200) {
               resolve(response.data.teamRooms);
            } else {
               reject(response.status);
            }
         })
         .catch(err => reject(err));
   });
}

function getTeamRoomMembers(baseUrl, jwt, teamRoomId) {
   console.log(`getTeamRoomMembers(teamRoomId=${teamRoomId})`);
   return new Promise((resolve, reject) => {
      axios.get(`${baseUrl}/teamRooms/getMembers/${teamRoomId}`, { headers: { Authorization: `Bearer ${jwt}` } })
         .then((response) => {
            if (response.status === 200) {
               resolve(response.data.teamRoomMembers);
            } else {
               reject(response.status);
            }
         })
         .catch(err => reject(err));
   });
}

function getConversations(baseUrl, jwt, teamRoomId) {
   console.log(`getConversations(teamRoomId=${teamRoomId})`);

   return new Promise((resolve, reject) => {
      let query = `?teamRoomId=${teamRoomId}`;
      axios.get(`${baseUrl}/conversations/getConversations${query}`, { headers: { Authorization: `Bearer ${jwt}` } })
         .then((response) => {
            if (response.status === 200) {
               resolve(response.data.conversations);
            } else {
               reject(response.status);
            }
         })
         .catch(err => reject(err));
   });
}

function getTranscript(baseUrl, jwt, conversationId) {
   console.log(`getTranscript(conversationId=${conversationId})`);

   return new Promise((resolve, reject) => {
      axios.get(`${baseUrl}/conversations/getTranscript/${conversationId}`, { headers: { Authorization: `Bearer ${jwt}` } })
         .then((response) => {
            if (response.status === 200) {
               resolve(response.data.messages);
            } else {
               reject(response.status);
            }
         })
         .catch(err => reject(err));
   });
}

function printCurrentSessionContext(sessionCtx) {
   let buf = '{';
   if (sessionCtx.subscriberOrg) {
      buf += `\n   "subscriberOrg": ${JSON.stringify(sessionCtx.subscriberOrg)}`;
   }
   if (sessionCtx.team) {
      buf += (buf.length > 1) ? ',' : '';
      buf += `\n   "team": ${JSON.stringify(sessionCtx.team)}`;
   }
   if (sessionCtx.teamRoom) {
      buf += (buf.length > 1) ? ',' : '';
      buf += `\n   "teamRoom": ${JSON.stringify(sessionCtx.teamRoom)}`;
   }
   buf += (buf.length > 1) ? '\n}' : '}';
   console.log(`\n\nCurrent SESSION CONTEXT: ${buf}`);
}

function promptForMessage() {
   return new Promise((resolve, reject) => {
      prompt.get(['message'], (err, result) => {
         if (err) {
            reject(err);
         }
         resolve(result.message);
      });
   });
}

function createMessage(baseUrl, jwt, conversationId, messageText) {
   const body = { messageType: 'text', text: messageText };
   return new Promise((resolve, reject) => {
      axios.post(`${baseUrl}/conversations/${conversationId}/createMessage`, body, { headers: { Authorization: `Bearer ${jwt}` }, content_type: 'application/json' })
         .then((response) => {
            if (response.status === 201) {
               resolve(response.data);
            } else {
               reject(response);
            }
         })
         .catch(err => reject(err));
   });
}


// MAIN

const args = process.argv.slice(2);
if (args.length !== 1) {
   console.log('Usage: babel-node Client.js <Hable_API_URL>');
   console.log('Example: babel-node Client.js http://localhost:3000');
   console.log('Example: babel-node Client.js http://habla-fe-api-dev.habla.ai');
   process.exit();
}

let showPingMessages = false;

const apiBaseUrl = args[0];
let jwt;
let user;
let messaging;

const mainChoices = [
   { id: '1', name: 'Clear session context' },
   { id: '2', name: 'Set subscriberOrg in session context' },
   { id: '3', name: 'Set team in session context' },
   { id: '4', name: 'Set teamRoom in session context' },
   { id: '5', name: 'Show session context details' },
   { id: '6', name: 'Message with current context' },
   { id: '-1', name: 'Show/hide ping messages' },
   { id: '7', name: 'Exit' }
];

let subscriberOrgs;
let orgSubscribers;
let teams;
let teamMembers;
let teamRooms;
let teamRoomMembers;
let sessionCtx = {};


function showSessionContextDetails() {
   if (sessionCtx.subscriberOrg) {
      console.log(JSON.stringify(sessionCtx.subscriberOrg));
      let subscriberOrgIdx = -1;
      subscriberOrgs.some((org) => {
         subscriberOrgIdx += 1;
         return (org.subscriberOrgId === sessionCtx.subscriberOrg.subscriberOrgId);
      });
      console.log('Subscribers:');
      orgSubscribers[subscriberOrgIdx].forEach((subscriber) => {
         console.log(`     ${JSON.stringify(subscriber)}`);
      });
      console.log();
   }

   if (sessionCtx.team) {
      console.log(JSON.stringify(sessionCtx.team));
      let teamIdx = -1;
      teams.some((team) => {
         teamIdx += 1;
         return (team.teamId === sessionCtx.team.teamId);
      });
      console.log('Team Members:');
      teamMembers[teamIdx].forEach((team) => {
         console.log(`     ${JSON.stringify(team)}`);
      });
      console.log();
   }

   if (sessionCtx.teamRoom) {
      console.log(JSON.stringify(sessionCtx.teamRoom));
      let teamRoomIdx = -1;
      teamRooms.some((teamRoom) => {
         teamRoomIdx += 1;
         return (teamRoom.teamRoomId === sessionCtx.teamRoom.teamRoomId);
      });
      console.log('Team Room Members:');
      teamRoomMembers[teamRoomIdx].forEach((teamRoom) => {
         console.log(`     ${JSON.stringify(teamRoom)}`);
      });
      console.log();
   }
}

function chat(conversation) {
   return new Promise((resolve, reject) => {
      promptForMessage()
         .then((msg) => {
            if (msg === 'transcript') {
               return new Promise((resolveTranscript, rejectTranscript) => {
                  getTranscript(apiBaseUrl, jwt, conversation.conversationId)
                     .then((messages) => {
                        messages.forEach((message) => {
                           console.log(JSON.stringify(message));
                        });
                        resolveTranscript(true);
                     })
                     .catch(err => rejectTranscript(err));
               });
            } else if (msg === 'exit') {
               return Promise.resolve();
            } else {
               return createMessage(apiBaseUrl, jwt, conversation.conversationId, msg);
            }
         })
         .then((continueChat) => {
            if (continueChat) {
               resolve(chat(conversation));
            }
            messaging.typing(conversation.conversationId, false);
            resolve();
         })
         .catch((err) => {
            if ((err.response) && (err.response.status === 400)) {
               console.log(err.message);
               if ((err.response.data) && (err.response.data.message)) {
                  console.log(err.response.data.message);
               }
               resolve(chat(conversation));
            } else {
               messaging.typing(conversation.conversationId, false);
               reject(err);
            }
         });
   });
}

function mainMenu() {
   printCurrentSessionContext(sessionCtx);

   return new Promise((resolve, reject) => {
      selectChoice('Main Menu:', 'name', 'id', mainChoices, false, false)
         .then((choice) => {
            if (choice.id === '-1') {
               showPingMessages = !showPingMessages;
               messaging.printPingMessages(showPingMessages);
            } else if (choice.id === '1') {
               sessionCtx = {};
            } else if (choice.id === '2') {
               return selectChoice('Select a subscriberOrg:', 'name', 'subscriberOrgId', subscriberOrgs, true)
                  .then((subscriberOrg) => {
                     sessionCtx.subscriberOrg = subscriberOrg;
                     sessionCtx.team = undefined;
                     sessionCtx.teamRoom = undefined;
                     const subscriberOrgId =  (subscriberOrg) ? subscriberOrg.subscriberOrgId : undefined;
                     Promise.all([getTeams(apiBaseUrl, jwt, subscriberOrgId), getTeamRooms(apiBaseUrl, jwt, { subscriberOrgId })])
                        .then((resultData) => {
                           teams = resultData[0];
                           teamRooms = resultData[1];
                           return mainMenu();
                        })
                        .catch(err => reject(err));
                  })
                  .catch(err => reject(err));
            } else if (choice.id === '3') {
               return selectChoice('Select a team:', 'name', 'teamId', teams, true)
                  .then((team) => {
                     sessionCtx.team = team;
                     sessionCtx.teamRoom = undefined;
                     const teamId = (team) ? team.teamId : undefined;
                     const subscriberOrgId = ((teamId === undefined) && (sessionCtx.subscriberOrg)) ? sessionCtx.subscriberOrg.subscriberOrgId : undefined;
                     getTeamRooms(apiBaseUrl, jwt, { teamId, subscriberOrgId })
                        .then((retrievedTeamRooms) => {
                           teamRooms = retrievedTeamRooms;
                           return mainMenu();
                        })
                        .catch(err => reject(err));
                  })
                  .catch(err => reject(err));
            } else if (choice.id === '4') {
               return selectChoice('Select a teamRoom:', 'name', 'teamRoomId', teamRooms, true)
                  .then((teamRoom) => {
                     sessionCtx.teamRoom = teamRoom;
                     return mainMenu();
                  })
                  .catch(err => reject(err));
            } else if (choice.id === '5') {
               showSessionContextDetails();
            } else if (choice.id === '6') {
               return new Promise((resolveChat, rejectChat) => {
                  getConversations(apiBaseUrl, jwt, (sessionCtx.teamRoom) ? sessionCtx.teamRoom.teamRoomId : sessionCtx.teamRoom)
                     .then((conversations) => {
                        if (conversations.length === 0) {
                           console.warn('***** No conversations found.  Bad data?');
                           return Promise.resolve();
                        }

                        const chatConversations = [];
                        if (conversations.length === 1) {
                           chatConversations.push(conversations[0]);
                        } else if (conversations.length > 1) {
                           console.warn('***** Multiple conversations found for current session context.  Bad data?');
                           conversations.forEach((conversation) => {
                              let problems = '';
                              if ((conversation.participants === undefined) || (conversation.participants.length === 0)) {
                                 problems += (problems.length > 0) ? '  ' : '';
                                 problems += 'Bad data (no participants).';
                              }
                              if ((sessionCtx.teamRoom) && (conversation.teamRoomId !== sessionCtx.teamRoom.teamRoomId)) {
                                 problems += (problems.length > 0) ? '  ' : '';
                                 problems += 'teamRoomId doesn\'t match session context.';
                              }
                              if (problems.length > 0) {
                                 console.warn(`Bad data (no participants) -> ${JSON.stringify(conversation)}`);
                              } else {
                                 console.log(`${JSON.stringify(conversation)}`);
                                 chatConversations.push(conversation);
                              }
                           });

                           if (chatConversations.length === 1) {
                              console.log(`Chatting here: ${JSON.stringify(chatConversations[0])}`);
                           } else {
                              console.log('TODO: need to select which conversation.');
                           }
                        }

                        if (chatConversations.length === 1) {
                           console.log('\nStart chatting!  Enter the word "transcript" to get the full transcript.  Enter the word "exit" to exit chat.');
                           messaging.typing(chatConversations[0].conversationId, true);
                           return chat(chatConversations[0]);
                        }
                        return Promise.resolve();
                     })
                     .then(() => {
                        resolveChat();
                        mainMenu();
                     })
                     .catch(err => rejectChat(err));
               });
            } else if (choice.id === '7') {
               messaging.close();
               process.exit();
            }

            return mainMenu();
         })
         .catch(err => reject(err));
   });
}

promptCredentials()
   .then(creds => login(apiBaseUrl, creds.username, creds.password))
   .then((responseData) => {
      jwt = responseData.token;
      user = responseData.user;
      console.log(`User: ${JSON.stringify(user)}`);

      messaging = new Messaging(responseData.websocketUrl);

      return Promise.all([
         messaging.connect(jwt),
         getSubscriberOrgs(apiBaseUrl, jwt),
         getTeams(apiBaseUrl, jwt),
         getTeamRooms(apiBaseUrl, jwt)
      ]);
   })
   .then((allData) => {
      subscriberOrgs = allData[1];
      teams = allData[2];
      teamRooms = allData[3];
      const getOrgSubscribers = subscriberOrgs.map(subscriberOrg => getSubscribers(apiBaseUrl, jwt, subscriberOrg.subscriberOrgId));
      return Promise.all(getOrgSubscribers);
   })
   .then((retrievedOrgSubscribers) => {
      orgSubscribers = retrievedOrgSubscribers;
      const getTeamMembersPromises = teams.map(team => getTeamMembers(apiBaseUrl, jwt, team.teamId));
      return Promise.all(getTeamMembersPromises);
   })
   .then((retrievedTeamMembers) => {
      teamMembers = retrievedTeamMembers;
      const getTeamRoomMembersPromises = teamRooms.map(team => getTeamRoomMembers(apiBaseUrl, jwt, team.teamRoomId));
      return Promise.all(getTeamRoomMembersPromises);
   })
   .then((retrievedTeamRoomMembers) => {
      teamRoomMembers = retrievedTeamRoomMembers;
      return mainMenu();
   })
   .catch((err) => {
      if (messaging) {
         messaging.close();
      }

      console.error(err.message);
      if ((err.response) && (err.response.data)) {
         console.error(err.response.data);
      } else if (err.message.indexOf('ECONNREFUSED') >= 0) {
         // No need for a verbose error message.
      } else {
         console.error(err);
      }
      process.exit();
   });
