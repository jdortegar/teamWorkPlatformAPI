import * as conversationSvc from '../../services/conversationService';

export const createConversation = async (req, res, next)  => {
    try {
        const { orgId, members } = req.body;
        const conversation = await conversationSvc.createDirectConversation(req, orgId, members);
        return res.json(conversation);
    } catch (err) {
        next(err)
    }
    
}