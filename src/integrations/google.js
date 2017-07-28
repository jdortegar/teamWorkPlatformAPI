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

export function getUserInfo(req, userAccessToken) {
   return new Promise((resolve, reject) => {
      req.logger.info('AD: 10');
      const plus = google.plus('v1');
      req.logger.info('AD: 11');
      const client = new OAuth2(
         clientId,
         clientSecret,
         redirectUri
      );
      req.logger.info(`AD: 12: client=${client}`);
      client.setCredentials({ access_token: userAccessToken });
      req.logger.info('AD: 13');
      plus.people.get({ userId: 'me', auth: client }, (err, response) => {
         req.logger.info(`AD: 14, err=${err}`);
         if (err) {
            req.logger.info('AD: 15');
            reject(err);
         } else {
            req.logger.info('AD: 16');
            resolve(response);
         }
      });
      req.logger.info('AD: 17');
   });
}

export function googleSiteVerification(req, res, next) {
   if (req.url.match(/^\/google.*.html$/)) {
      const googleUrl = req.url.substring(1);
      res.send(`google-site-verification: ${googleUrl}`);
   } else {
      next();
   }
}

export function validateWebhookMessage(req) {
   if (req.get('X-Goog-Channel-Token') !== googleChannelKey) {
      throw new IntegrationAccessError('Invalid Google webhook message.');
   }
}
