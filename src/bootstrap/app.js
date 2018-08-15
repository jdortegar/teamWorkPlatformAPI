import express from 'express';

const app = express();
app.enable('trust proxy');

// TODO: Set cookie parser. src/config/express.js line 18

// Hack for SNS incorrect content type "text/plain" when it should be "application/json".
// Forces bodyParser to parse JSON and put into req.body.
// https://forums.aws.amazon.com/thread.jspa?messageID=254070&#254070
app.use((req, res, next) => {
    if (req.get('x-amz-sns-message-type')) {
        req.headers['content-type'] = 'application/json';
    }
    next();
});
 
// TODO: Set body parser src/config/express.js line 31 

// TODO: Set Cors src/config/express.js line 34

// TODO: Migrate preAuthMiddleware src/config/express line 36

// TODO: Check if remove or refactor extract API Version src/config/express line 41

// TODO: Set up JWT middleware src/config/express.js line 61

// TODO: Migrate postAuthMiddleware src/config/express.js line 82

// TODO: Mount Routes src/config/express.js line 85

// TODO: Redesign error handling src/config/express.js line 95

export default app;