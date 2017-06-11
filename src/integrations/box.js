import BoxSDK from 'box-node-sdk';
import config from '../config/env';

export const clientId = config.boxClientId;
const clientSecret = config.boxClientSecret;

const sdk = new BoxSDK({ clientID: clientId, clientSecret });


export function exchangeAuthorizationCodeForAccessToken(authorizationCode) {
   return new Promise((resolve, reject) => {
      sdk.getTokensAuthorizationCodeGrant(authorizationCode, null, (error, tokenInfo) => {
         if (error) {
            reject(error);
         } else {
            resolve(tokenInfo);
         }
         // tokenInfo: {
         //  accessToken: 'ACCESS_TOKEN',
         //  refreshToken: 'REFRESH_TOKEN',
         //  acquiredAtMS: 1464129218402,
         //  accessTokenTTLMS: 3600000,
         // }
      });
   });
}

/**
 * Example: {"type":"user","id":"1831614173","name":"Anthony Daga","login":"anthony@habla.io","created_at":"2017-06-06T17:10:56-07:00","modified_at":"2017-06-10T13:49:48-07:00","language":"en","timezone":"America/Los_Angeles","space_amount":1000000000000000,"space_used":0,"max_upload_size":5368709120,"status":"active","job_title":"","phone":"6193478347","address":"","avatar_url":"https://app.box.com/api/avatar/large/1831614173"}
 *
 * @param userAccessToken
 * @returns {Promise}
 */
export function getUserInfo(userAccessToken) {
   return new Promise((resolve, reject) => {
      const client = sdk.getBasicClient(userAccessToken);
      client.users.get(client.CURRENT_USER_ID, null, (err, currentUser) => {
         if (err) {
            reject(err);
         } else {
            resolve(currentUser);
         }
      });
   });
}
