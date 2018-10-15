import axios from 'axios';
import https from 'https';
import config from '../config/env';
import { IntegrationAccessError } from '../services/errors';

const clientId = config.dropboxClientId;
const clientSecret = config.dropboxClientSecret;
const redirectUri = `${config.apiEndpoint}/integrations/dropbox/access`;

const accessUri = 'https://www.dropbox.com/oauth2/authorize';

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
        const uri = 'https://api.dropboxapi.com/oauth2/token';
        const paramsObject = {
            code: authorizationCode,
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
        };
        const params = Object.keys(paramsObject).map(key => `${key}=${encodeURIComponent(paramsObject[key])}`).join('&');
        const basicAuth = new Buffer(`${clientId}:${clientSecret}`).toString('base64');
        axios.post(uri, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .then((response) => {
                const { data } = response;
                resolve(data);
            })
            .catch((err) => {
                reject(err)
            });
    });
};

const makeRevoke = (accessToken) => {
    return new Promise((resolve, reject) => {
        https.request('https://api.dropboxapi.com/2/auth/token/revoke', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }, (err, response) => {
            if (err) {
                return reject(err);
            } 
            return resolve(response);
        });
    })
};

export const revokeIntegration = async (req, userAccessToken) => {
    return Promise.resolve(); // TODO: Figure out how to revoke without errors.
    // try {
    //     const response = await makeRevoke(userAccessToken);
    //     console.log('*** RESPONSE ***', response );
    //     // const response = await axios.post('https://api.dropboxapi.com/1/disable_access_token', {
    //     // const response = await axios({
    //     //     method: 'post',
    //     //     url: 'https://api.dropboxapi.com/2/auth/token/revoke',
    //     //     headers: {
    //     //         'Authorization': `Bearer ${userAccessToken}`,
    //     //         'Content-Type': 'application/json'
    //     //     },
    //     //     data: ''
    //     // });
    //     // const response = await axios.post('https://api.dropboxapi.com/2/auth/token/revoke', '', {
    //     //     headers: {
    //     //         Authorization: `Bearer ${userAccessToken}`,
    //     //         'Content-Type': 'text/plain; charset=dropbox-cors-hack'
    //     //     }
    //     // });
    //     // console.log('****RESPONSE DATA***', response.status, response.data);
    //     // if (response.status !== 200) {
    //     //     throw new IntegrationAccessError(`Failed to revoke dropbox integration. ${JSON.stringify(response.data)}`)
    //     // }
    // } catch (err) {
    //     // console.log('****ERROR DATA INTEGRATION', err.response.status, err.response.data);
    //     throw new IntegrationAccessError(`Failed to revoke dropbox integration ${err}`);
    // }
};
