import axios from 'axios';
import https from 'https';
import fetch from 'isomorphic-fetch';
import { Dropbox } from 'dropbox';
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
    try {
        const dropbox = new Dropbox({
            accessToken: userAccessToken,
            fetch
        });
        await  dropbox.authTokenRevoke();

    } catch (err) {
        Promise.reject(new IntegrationAccessError(`Failed to revoke dropbox integration. ${JSON.stringify(err)}`));
    }
};
