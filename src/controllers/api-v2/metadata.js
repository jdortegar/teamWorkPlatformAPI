import httpStatus from 'http-status';
import * as metadataSvc from '../../services/metadata/metadataService';

export const getMeta = async (req, res) => {
    try {
        const { url } = req.query;
        const metadata = await metadataSvc.getMeta(req, url);
        return res.json(metadata);
    } catch (err) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            error: 'Internal Server Error',
            message: 'Something went wrong'
        });
    }
};
