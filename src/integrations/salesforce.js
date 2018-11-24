import axios from 'axios';
import config from '../config/env';
import { IntegrationAccessError } from '../services/errors';

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

export const revokeIntegration = async (req, userAccessToken) => {
    try {
        const uri = `https://login.salesforce.com/services/oauth2/revoke?token=${userAccessToken}`;        
        const response = await axios.get(uri);
        if (response.status !== 200) {
            throw new IntegrationAccessError(`Failed to revoke salesforce integration. ${JSON.stringify(response.data)}`);
        }
    } catch (err) {
        const typedError = (err instanceof IntegrationAccessError) ? err : new IntegrationAccessError(`Failed to revoke google Integration. ${err}`);    
        return Promise.reject(typedError);
    }
};
