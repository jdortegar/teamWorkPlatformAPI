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
    subject: 'Reset Your Habla Password',
    html: '<style type="text/css">.centerImage{text-align:center;display:block;}</style><img src="https://static.wixstatic.com/media/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg/v1/fill/w_247,h_244,al_c,q_80,usm_0.66_1.00_0.01/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg" height="100" width="100" class="centerImage"><br>Thank you for using Habla.  Please click on this <a href="http://habla.io">link</a> to reset your Habla password.'
  });
}

function sendActivationLink(email, rid) {
  console.log('rid: ' + rid);
  return transport.sendMailAsync({
    from: 'habla-mailer-dev@habla.ai',
    to: email,
    subject: 'Your Habla.ai Account',
    html: '<h1><img src="https://static.wixstatic.com/media/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg/v1/fill/w_247,h_244,al_c,q_80,usm_0.66_1.00_0.01/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg" height="100" width="100" align="middle"></h1><br>Thank you for registering for Habla.  Please click on this <a href="http://localhost:3000/users/validateEmail/' + rid + '">link</a> to activate your account.'
  });
}

module.exports = {
  sendResetPassword: sendResetPassword,
  sendActivationLink: sendActivationLink
};
