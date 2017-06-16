import google from 'googleapis';
import config from '../config/env';

const clientId = config.googleClientId;
const clientSecret = config.googleClientSecret;
const redirectUri = `${config.apiEndpoint}/integrations/google/access`;

const scopes = [
   'https://www.googleapis.com/auth/userinfo.profile',
   'https://www.googleapis.com/auth/drive.readonly'
];

const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
   clientId,
   clientSecret,
   redirectUri
);

export function composeAuthorizationUrl(state) {
   const settings = {
      // 'online' (default) or 'offline' (gets refresh_token).
      access_type: 'offline',
      scope: scopes,
      // Optional property that passes state parameters to redirect URI.
      state
   };
   return oauth2Client.generateAuthUrl(settings);
}

/**
 * tokenInfo: {
 *    access_token: 'ACCESS_TOKEN',
 *    id_token: 'JWT',
 *    refresh_token: 'REFRESH_TOKEN',
 *    token_type: 'Bearer',
 *    expiry_date: 1497501900732
 * }
 *
 * @param authorizationCode
 * @returns {Promise}
 */
export function exchangeAuthorizationCodeForAccessToken(authorizationCode) {
   return new Promise((resolve, reject) => {
      oauth2Client.getToken(authorizationCode, (err, tokens) => {
         if (err) {
            reject(err);
         } else {
            resolve(tokens);
         }
      });
   });
}

export function getUserInfo(userAccessToken) {
   return new Promise((resolve, reject) => {
      const plus = google.plus('v1');
      const client = new OAuth2(
         clientId,
         clientSecret,
         redirectUri
      );
      client.setCredentials({ access_token: userAccessToken });
      plus.people.get({ userId: 'me', auth: client }, (err, response) => {
         if (err) {
            reject(err);
         } else {
            resolve(response);
         }
      });
   });
}
