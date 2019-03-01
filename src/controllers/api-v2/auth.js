import httpStatus from 'http-status';
import * as urlParser from 'url';
import jwt from 'jsonwebtoken';
import config from '../../config/env';

export const validateMeetToken = (req, res) =>{
    const originalUri = req.get('X-Original-URI');
    if (!originalUri) {
        return res.status(httpStatus.UNAUTHORIZED).json(
            {
                error: 'Original Uri not found'
            }
        );
    }
    const url = new urlParser.URL(originalUri);
    
    const token = url.searchParams.get('jwt');
    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({
            error: 'Token not provided'
        });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        return res.json(decoded);
    } catch (err) {
        return res.status(httpStatus.FORBIDDEN).json({
            error: err.message
        });
    }
}
