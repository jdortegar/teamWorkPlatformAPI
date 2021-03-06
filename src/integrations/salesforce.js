import axios from 'axios';
import config from '../config/env';

const clientId = config.salesforceClientId;
const clientSecret = config.salesforceClientSecret;
const redirectUri = `${config.apiEndpoint}/integrations/salesforce/access`;

const accessUri = 'https://login.salesforce.com/services/oauth2/authorize';


export const composeAuthorizationUrl = (state) => {
   const paramsObject = {
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
   };
   const params = Object.keys(paramsObject).map(key => `${key}=${encodeURIComponent(paramsObject[key])}`).join('&');
   return `${accessUri}?${params}`;
};

export const exchangeAuthorizationCodeForAccessToken = (authorizationCode) => {
   return new Promise((resolve, reject) => {
      const uri = 'https://login.salesforce.com/services/oauth2/token';
      const paramsObject = {
         grant_type: 'authorization_code',
         client_secret: clientSecret,
         client_id: `${clientId}`,
         redirect_uri: redirectUri,
         code: authorizationCode
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
