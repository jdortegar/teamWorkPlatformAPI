/* eslint-disable max-len */
import AWS from 'aws-sdk';
import nodemailer from 'nodemailer';
import config from '../config/env';

const transport = nodemailer.createTransport({
   SES: new AWS.SES({
      transport: 'ses',
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
      region: config.aws.awsRegion
   })
});

function sendMail(mailOptions) {
   return new Promise((resolve, reject) => {
      transport.sendMail(mailOptions, (error, info) => {
         if (error) {
            reject(error);
         } else {
            resolve(info);
         }
      });
   });
}

// export function sendResetPassword(email, token) {
//    return transport.sendMail({
//       from: 'habla-mailer-dev@habla.ai',
//       to: email,
//       subject: 'Reset Your Habla Password',
//       html: `
//          <style type="text/css">.centerImage{text-align:center;display:block;}</style>
//          <img src="https://static.wixstatic.com/media/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg/v1/fill/w_247,h_244,al_c,q_80,usm_0.66_1.00_0.01/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg" height="100" width="100" class="centerImage" />
//          <br>Thank you for using Habla AI.  Please click on this <a href="http://habla.io">link</a> to reset your Habla password.
//       `
//    });
// }

export function sendActivationLink(email, rid) {
   const html = `
      <h1>
         <img src="https://static.wixstatic.com/media/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg/v1/fill/w_247,h_244,al_c,q_80,usm_0.66_1.00_0.01/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg" height="100" width="100" align="middle" />
      </h1>
      <br>Thank you for registering for Habla AI.<br>
      <br>If reading this from a web browser, please <a href="${config.webappBaseUri}/verifyAccount/${rid}">click here</a> to activate your account.<br>
      <br>If reading this from an iOS device, please tap on the following link to activate your account:  hablaai://signup/${rid}
   `;
   return sendMail({
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: 'Your Habla.ai Account',
      html
   });
}

export function sendSubscriberOrgInviteToExternalUser(email, subscriberOrgName, byUserDisplayName, rid) {
   const html = `
      <h1><img src="https://static.wixstatic.com/media/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg/v1/fill/w_247,h_244,al_c,q_80,usm_0.66_1.00_0.01/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg" height="100" width="100" align="middle"></h1>
      <br>${byUserDisplayName} has invited you to "${subscriberOrgName}" in Habla AI.<br>
      <br>If reading this from a web browser, please <a href="${config.webappBaseUri}/signup/${rid}">click here</a> to activate your account and join them.<br>
      <br>If reading this from an iOS device, please tap on the following link to activate your account and join them:  hablaai://signup/${rid}
   `;
   return sendMail({
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: `Invitation to join "${subscriberOrgName}" on Habla.ai`,
      html
   });
}

export function sendSubscriberOrgInviteToExistingUser(email, subscriberOrgName, byUserDisplayName, key) {
   const webKey = key.split('=')[1];
   const html = `
      <h1><img src="https://static.wixstatic.com/media/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg/v1/fill/w_247,h_244,al_c,q_80,usm_0.66_1.00_0.01/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg" height="100" width="100" align="middle"></h1>
      <br>${byUserDisplayName} has invited you to "${subscriberOrgName}" on Habla AI.<br>
      <br>If reading this from a web browser, please <a href="${config.webappBaseUri}/app/acceptinvitation/subscriberOrg/${webKey}">click here</a> to join them.<br>
      <br>If reading this from an iOS device, please tap on the following link to join them:  hablaai://acceptinvitation/?${key}
   `;
   return sendMail({
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: `Invitation to join "${subscriberOrgName}" on Habla.ai`,
      html
   });
}

export function sendTeamInviteToExistingUser(email, subscriberOrgName, teamName, byUserDisplayName, key) {
   const webKey = key.split('=')[1];
   const html = `
      <h1><img src="https://static.wixstatic.com/media/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg/v1/fill/w_247,h_244,al_c,q_80,usm_0.66_1.00_0.01/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg" height="100" width="100" align="middle"></h1>
      <br>${byUserDisplayName} has invited you to team "${teamName}" of "${subscriberOrgName}" in Habla AI.<br>
      <br>If reading this from a web browser, please <a href="${config.webappBaseUri}/app/acceptinvitation/team/${webKey}">click here</a> to join them.<br>
      <br>If reading this from an iOS device, please tap on the following link to join them:  hablaai://acceptinvitation/?${key}
      `;
   return sendMail({
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: `Invitation to join "${teamName}" of "${subscriberOrgName}" on Habla AI`,
      html
   });
}

export function sendTeamRoomInviteToExistingUser(email, subscriberOrgName, teamName, teamRoomName, byUserDisplayName, key) {
   const webKey = key.split('=')[1];
   const html = `
      <h1><img src="https://static.wixstatic.com/media/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg/v1/fill/w_247,h_244,al_c,q_80,usm_0.66_1.00_0.01/ac0e25_95ce977831a9430989f049b46928fda6~mv2.jpg" height="100" width="100" align="middle"></h1>
      <br>${byUserDisplayName} has invited you to team room "${teamRoomName}" of "${subscriberOrgName}" in Habla AI.<br>
      <br>If reading this from a web browser, please <a href="${config.webappBaseUri}/app/acceptinvitation/teamRoom/${webKey}">click here</a> to join them.<br>
      <br>If reading this from an iOS device, please tap on the following link to join them:  hablaai://acceptinvitation/?${key}
      `;
   return sendMail({
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: `Invitation to join "${teamRoomName}" of "${subscriberOrgName}" on Habla.ai`,
      html
   });
}
