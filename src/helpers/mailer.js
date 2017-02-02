var nodemailer = require('nodemailer');
var config = require('../config/env');
var Promise = require('bluebird');

var transport = nodemailer.createTransport({
  transport: 'ses',
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey
});

Promise.promisifyAll(transport);

function sendResetPassword(email, token) {
  return transport.sendMailAsync({
    from: 'dev-symphony@nexusnumber.com',
    to: email,
    subject: 'Reset Password',
    html: 'Please click on this <a href="' + config.clientUrl + '/set-password?token=' +
      token + '">link</a> to set new password.'
  });
}

function sendActivationLink(email, token) {
  return transport.sendMailAsync({
    from: 'dev-symphony@nexusnumber.com',
    to: email,
    subject: 'Your account has been created',
    html: 'Please click on this <a href="' + config.clientUrl + '/set-password?token=' +
      token + '">link</a> to activate your account.'
  });
}

module.exports = {
  sendResetPassword: sendResetPassword,
  sendActivationLink: sendActivationLink
};
