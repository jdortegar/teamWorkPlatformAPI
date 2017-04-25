import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import { messageCreated } from '../services/messaging';

export function events(req, res, next) {
   const event = req.body;

   messageCreated(req, event)
      .then(() => res.status(httpStatus.CREATED).end())
      .catch(err => next(new APIError(err, httpStatus.SERVICE_UNAVAILABLE)));
}

