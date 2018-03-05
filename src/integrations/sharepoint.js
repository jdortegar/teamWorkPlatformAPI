import axios from 'axios';
import config from '../config/env';
// import { IntegrationAccessError } from '../services/errors';

const clientId = config.sharepointClientId;
const clientSecret = config.sharepointClientSecret;
const redirectUri = `${config.apiEndpoint}/integrations/sharepoint/access`;
const audiencePrincipalId = '00000003-0000-0ff1-ce00-000000000000'; // audience principal ID is a permanent security principal ID for SharePoint.


export const composeAuthorizationUrl = (sharepointOrg) => {
   const paramsObject = {
      client_id: clientId,
      scope: 'AllSites.Read Site.Read AllProfiles.Read Web.Read',
      response_type: 'code',
      redirect_uri: redirectUri
   };
   const params = Object.keys(paramsObject).map(key => `${key}=${encodeURIComponent(paramsObject[key])}`).join('&');
   return `https://${sharepointOrg}.sharepoint.com/_layouts/oauthauthorize.aspx?${params}`;
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
export const exchangeAuthorizationCodeForAccessToken = (req, authorizationCode, sharepointOrg) => {
   return new Promise((resolve, reject) => {
      let realm;
      axios.get(`https://${sharepointOrg}.sharepoint.com/_vti_bin/client.svc`, { headers: { Authorization: 'Bearer' } })
         .catch((err) => {
            const wwwAuthenticate = err.response.headers['www-authenticate'];
            const keyValues = wwwAuthenticate.split(',');
            const keys = {};
            keyValues.forEach((keyValue) => {
               const keyAndValue = keyValue.split('=');
               const key = keyAndValue[0];
               let value = keyAndValue[1];

               // Remove quotes.
               if (value) {
                  const toks = value.split('"');
                  if (toks.length === 3) {
                     value = toks[1];
                  }
               }
               keys[key] = value;
            });
            realm = keys['Bearer realm'];
            const uri = `https://accounts.accesscontrol.windows.net/${realm}/tokens/OAuth/2`;
            const paramsObject = {
               grant_type: 'authorization_code',
               client_id: `${clientId}@${realm}`,
               client_secret: clientSecret,
               code: authorizationCode,
               redirect_uri: redirectUri,
               resource: `${audiencePrincipalId}/${sharepointOrg}.sharepoint.com@${realm}`
            };
            const params = Object.keys(paramsObject).map(key => `${key}=${encodeURIComponent(paramsObject[key])}`).join('&');
            return axios.post(uri, params);
         })
         .then((response) => {
            const { data } = response;
            data.sharepointOrg = sharepointOrg;
            data.realm = realm;

            // TODO: get list of sites and give to user.

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
export const getUserInfo = (req, sharepointOrg, userAccessToken) => {
   return new Promise((resolve, reject) => {
      axios.get(`https://${sharepointOrg}.sharepoint.com/_api/web/CurrentUser`, { headers: { Authorization: `Bearer ${userAccessToken}` } })
         .then((response) => {
            resolve(response.data);
         })
         .catch(err => reject(err));
   });
};

export const getSites = (req, sharepointOrg, userAccessToken) => {
   return new Promise((resolve, reject) => {
      const query = "'contentclass:STS_Site contentclass:STS_Web'";
      axios.get(`https://${sharepointOrg}.sharepoint.com/_api/search/query?querytext=${encodeURIComponent(query)}`,
         { headers: { Authorization: `Bearer ${userAccessToken}` } }
      )
         .then((response) => {
            const sites = [];
            response.data.PrimaryQueryResult.RelevantResults.Table.Rows.forEach(({ Cells }) => {
               Cells.forEach((cell) => {
                  if ((cell.Key === 'SPWebUrl') && (cell.ValueType === 'Edm.String')) {
                     const value = cell.Value;
                     if ((value.indexOf('.sharepoint.com/sites/') > 0) && (!value.endsWith('contentTypeHub'))) {
                        sites.push(value);
                     }
                  }
               });
            });
            resolve(sites);
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

