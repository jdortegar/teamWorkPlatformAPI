var nodemailer = require('nodemailer');
var config = require('../config/env');
var Promise = require('bluebird');

var transport = nodemailer.createTransport({
  transport: 'ses',
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey, 
  region: config.aws.awsRegion
});

Promise.promisifyAll(transport);

function sendResetPassword(email, token) {
  return transport.sendMailAsync({
    from: 'habla-mailer-dev@habla.ai',
    to: email,
    subject: 'Reset Password',
    html: 'Please click on this <a href="' + config.clientUrl + '/set-password?token=' +
      token + '">link</a> to set new password.'
  });
}

function sendActivationLink(email, token) {
  return transport.sendMailAsync({
    from: 'robert.abbott@habla.ai',
    to: email,
    subject: 'Your Habla.ai Account',
    html: 'Please click on this link to activate your account.'
  });
}

module.exports = {
  sendResetPassword: sendResetPassword,
  sendActivationLink: sendActivationLink
};
