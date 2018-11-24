import httpStatus from 'http-status';
import config from '../config/env';
import * as boxSvc from '../services/boxService';
import { APIError, APIWarning, IntegrationAccessError, SubscriberOrgNotExistError } from '../services/errors';

// ex. https://hablaapi.ngrok.io/integrations/box/integrate/:subscriberOrgId
export const integrateBox = (req, res, next) => {
    const userId = req.user._id;
    const subscriberOrgId = req.params.subscriberOrgId;

    boxSvc.integrateBox(req, userId, subscriberOrgId)
        .then((boxUri) => {
            if (req.accepts('application/json')) {
                res.status(httpStatus.ACCEPTED).json({ location: boxUri });
            } else {
                res.redirect(boxUri);
            }
        })
        .catch((err) => {
            if (err instanceof SubscriberOrgNotExistError) {
                next(new APIWarning(httpStatus.NOT_FOUND, err));
            } else {
                next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
            }
        });
};

export const boxAccess = async (req, res) => {
    try {
        const teamLevelVal = await req.app.locals.redis.getAsync(`${boxSvc.hashKey(req.query.state)}#teamLevel`) || 0;
        const teamLevel = teamLevelVal == 1;
        let redirectUri;
        if (teamLevel) {
            redirectUri = `${config.webappBaseUri}/app/teamIntegrations`;
        } else  {
            redirectUri = `${config.webappBaseUri}/app/integrations`;
        }
        const subscriberId = await boxSvc.boxAccessResponse(req, req.query);
        res.redirect(`${redirectUri}/${subscriberId}/box/CREATED`);
    } catch (err) {
        const subscriberId = err.subscriberOrgId;
        const realError = err._chainedError || err;
        if (realError instanceof IntegrationAccessError) {
            res.redirect(`${redirectUri}/${subscriberId}/box/FORBIDDEN`);
        } else if (realError instanceof SubscriberOrgNotExistError) {
            res.redirect(`${redirectUri}/${subscriberId}/box/NOT_FOUND`);
        } else {
            res.redirect(`${redirectUri}/${subscriberId}/box/INERNAL_SERVER_ERROR`);
        }
    }
};

export const revokeBox = (req, res, next) => {
    const userId = req.user._id;
    const subscriberOrgId = req.params.subscriberOrgId;

    boxSvc.revokeBox(req, userId, subscriberOrgId)
        .then(() => {
            res.status(httpStatus.OK).end();
        })
        .catch((err) => {
            if (err instanceof SubscriberOrgNotExistError) {
                next(new APIWarning(httpStatus.NOT_FOUND, err));
            } else if (err instanceof IntegrationAccessError) {
                next(new APIWarning(httpStatus.GONE, err));
            } else {
                next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
            }
        });
};

export const boxApp = (req, res, next) => {
    const { user_id, file_id } = req.query; // eslint-disable-line no-unused-vars

    boxSvc.getSubscriberUsersAndOrgsByBoxUserId(req, user_id)
        .then((subscriberUsersAndOrgs) => {
            if (subscriberUsersAndOrgs.length === 0) {
                // boxUserId not found in system.
                const createAccountUri = `${config.webappBaseUri}/register`; // eslint-disable-line no-unused-vars
                res.send(`
               <html>
                  <body>
                     <h3>No corresponding user in Habla AI.  Please create an Habla AI account here:</h3>
                     <a href={createAccountUri}>{createAccountUri}</a>
                  </body>
               </html>
            `);
            }

            res.send(`
            <html>
               <body>
                  <h3>Share with Habla AI</h3>
               </body>
            </html>
         `);
        })
        .catch((err) => {
            next(new APIError(httpStatus.INTERNAL_SERVER_ERROR, err));
        });
};

export const boxWebhooks = (req, res) => {
    boxSvc.webhookEvent(req)
        .then(() => res.status(httpStatus.ACCEPTED).end())
        .catch((err) => {
            req.logger.error(err);
            if (err instanceof IntegrationAccessError) {
                res.status(httpStatus.FORBIDDEN).end();
            } else {
                res.status(httpStatus.INTERNAL_SERVER_ERROR).end();
            }
        });
};

