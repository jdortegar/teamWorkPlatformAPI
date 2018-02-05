// import axios from 'axios';
import google from 'googleapis';
import config from '../config/env';
import { IntegrationAccessError } from '../services/errors';

const clientId = config.googleClientId;
const clientSecret = config.googleClientSecret;
const redirectUri = `${config.apiEndpoint}/integrations/google/access`;
const googleChannelKey = config.googleChannelKey;

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

export const composeAuthorizationUrl = (state) => {
   const settings = {
      access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token).
      approval_prompt: 'force', // refresh_token given only on initial authorization.  This forces subsequent.
      scope: scopes,
      // Optional property that passes state parameters to redirect URI.
      state
   };
   return oauth2Client.generateAuthUrl(settings);
};

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
export const exchangeAuthorizationCodeForAccessToken = (authorizationCode) => {
   return new Promise((resolve, reject) => {
      oauth2Client.getToken(authorizationCode, (err, tokens) => {
         if (err) {
            reject(err);
         } else {
            resolve(tokens);
         }
      });
   });
};

export const getUserInfo = (req, userAccessToken) => {
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
};

export const revokeIntegration = (req, userAccessToken) => { // eslint-disable-line no-unused-vars
   return Promise.resolve();
   // return new Promise((resolve, reject) => {
   //    axios.get(`https://accounts.google.com/o/oauth2/revoke?token=${userAccessToken}`)
   //       .then((response) => {
   //          if (response.status === 200) {
   //             resolve();
   //          } else {
   //             reject(new IntegrationAccessError('Failed to revoke google integration.'));
   //          }
   //       })
   //       .catch((err) => {
   //          reject(new IntegrationAccessError(`Failed to revoke google integration: ${err}`));
   //       });
   // });
};

export const googleSiteVerification = (req, res, next) => {
   if (req.url.match(/^\/google.*.html$/)) {
      const googleUrl = req.url.substring(1);
      res.send(`google-site-verification: ${googleUrl}`);
   } else {
      next();
   }
};

export const validateWebhookMessage = (req) => {
   if (req.get('X-Goog-Channel-Token') !== googleChannelKey) {
      throw new IntegrationAccessError('Invalid Google webhook message.');
   }
};

