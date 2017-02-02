var dev = require('./development');

module.exports = {
  db: process.env.DB_HOST || dev.db,
  jwtSecret: process.env.JWT_SECRET || dev.jwtSecret,
  port: process.env.PORT || dev.port,
  clientUrl: process.env.CLIENT_URL || dev.clientUrl,
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || dev.aws.accessKeyId,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || dev.aws.secretAccessKey
  }
};
