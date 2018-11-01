import httpStatus from 'http-status';
import { NoPermissionsError, SubscriberOrgNotExistError } from '../../services/errors';
import * as orgSvc from '../../services/subscriberOrgService';

export const getOrganizationInfo = async (req, res) => {
    try {
        const orgData = await orgSvc.getOrganizationInfo(req, req.params.orgId);
        return res.json(orgData);
    } catch(err) {
        if (err instanceof NoPermissionsError) {
            return res.status(httpStatus.FORBIDDEN).json({
                error: 'Forbidden',
                message: 'Only Organization admins can access this resource.'
            });
        }
        if (err instanceof SubscriberOrgNotExistError) {
            console.log(err);
            return res.status(httpStatus.NOT_FOUND).json({
                error: 'Not Found',
                message: 'Organization not found'
            })
        }
        console.log(err);
        throw err;
    }
}