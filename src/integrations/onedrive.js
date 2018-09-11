import axios from 'axios';
import config from '../config/env';
// import { IntegrationAccessError } from '../services/errors';

const clientId = config.onedriveClientId;
const clientSecret = config.onedriveClientSecret;
const redirectUri = `${config.apiEndpoint}/integrations/onedrive/access`;


export const composeAuthorizationUrl = () => {
   const paramsObject = {
      client_id: clientId,
      scope: 'User.Read Files.Read.All Notes.Read.All Sites.Read.All offline_access',
      response_type: 'code',
      redirect_uri: redirectUri
   };
   const params = Object.keys(paramsObject).map(key => `${key}=${encodeURIComponent(paramsObject[key])}`).join('&');
   return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
};

/**
 * tokenInfo: {
 *    accessToken: 'ACCESS_TOKEN',
 *    refreshToken: 'REFRESH_TOKEN',
 *    acquiredAtMS: 1464129218402,
 *    accessTokenTTLMS: 3600000,
 * }
 *
 * @param authorizationCode
 * @returns {Promise}
 */
export const exchangeAuthorizationCodeForAccessToken = (req, authorizationCode) => {
   return new Promise((resolve, reject) => {
      const uri = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      const paramsObject = {
         client_id: `${clientId}`,
         redirect_uri: redirectUri,
         client_secret: clientSecret,
         code: authorizationCode,
         grant_type: 'authorization_code'
      };
      const params = Object.keys(paramsObject).map(key => `${key}=${encodeURIComponent(paramsObject[key])}`).join('&');
      axios.post(uri, params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
         .then((response) => {
            const { data } = response;
            resolve(data);
         })
         .catch(err => reject(err));
   });
};

/**
 * Example:
 * {
 *    "type": "user",
 *    "id": "1831614173",
 *    "name": "Anthony Daga",
 *    "login": "anthony@habla.io",
 *    "created_at": "2017-06-06T17:10:56-07:00",
 *    "modified_at": "2017-06-10T13:49:48-07:00",
 *    "language": "en",
 *    "timezone": "America/Los_Angeles",
 *    "space_amount": 1000000000000000,
 *    "space_used": 0,
 *    "max_upload_size": 5368709120,
 *    "status": "active",
 *    "job_title": "",
 *    "phone": "6193478347",
 *    "address": "",
 *    "avatar_url": "https://app.box.com/api/avatar/large/1831614173"
 * }
 *
 * @param userAccessToken
 * @returns {Promise}
 */
export const getUserInfo = (req, userAccessToken) => {
   return new Promise((resolve, reject) => {
      axios.get('https://graph.microsoft.com/v1.0/me/', { headers: { Authorization: `Bearer ${userAccessToken}` } })
         .then((response) => {
            resolve(response.data);
         })
         .catch(err => reject(err));
   });
};

export const revokeIntegration = (req, userAccessToken) => { // eslint-disable-line no-unused-vars
   return Promise.resolve();
   // Moved to AI layer, since they need to do some work before actually revoking
   // return new Promise((resolve, reject) => {
   //    sdk.revokeTokens(userAccessToken, (err) => {
   //       if (err) {
   //          reject(new IntegrationAccessError(`Failed to revoke box integration: ${err}`));
   //       } else {
   //          resolve();
   //       }
   //    });
   // });
};

// export const validateWebhookMessage = (req) => {
//    if (BoxSDK.validateWebhookMessage(req.body, req.headers, primaryKey, secondaryKey) === false) {
//       throw new IntegrationAccessError('Invalid Box webhook message.');
//    }
// };

