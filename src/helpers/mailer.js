/* eslint-disable max-len */
import AWS from 'aws-sdk';
import nodemailer from 'nodemailer';
import uuid from 'uuid';
import config from '../config/env';
import mailerLogoBase64 from './mailerLogo.js';

export const mailerLogoBase64 = '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';

const transport = nodemailer.createTransport({
   SES: new AWS.SES({
      transport: 'ses',
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
      region: config.aws.awsRegion
   })
});

const sendMail = (cid, mailOptions) => {
   const options = mailOptions;
   if (cid !== null) {
      options.attachments = [{
         cid,
         encoding: 'base64',
         contentType: 'image/gif',
         // contentTransferEncoding: 'quoted-printable',
         contentDisposition: 'inline',
         content: mailerLogoBase64
      }];
   }

   return new Promise((resolve, reject) => {
      transport.sendMail(options, (error, info) => {
         if (error) {
            reject(error);
         } else {
            resolve(info);
         }
      });
   });
};

const htmlContents = (cid, html) => {
   return `
     <style type="text/css">
       .boxed {border: 2px solid lightgray; border-radius: 8px; padding: 40px; padding-top: 20px; width: 400; font-family: 'Arial'}
       .footer {padding-top: 20px; width: 400; font-family: 'Arial'; color: lightslategray; font-size: 11}
     </style>
     <h1><img src="cid:${cid}" width="200" height="56"></h1>
     <div class="boxed">
       ${html}
     </div>
     <div class="footer">This email was sent because your email is registered in Habla AI.
       If you don’t want to receive this email please click <a href="https://app.habla.ai">here</a> to manage your email settings.
     </div>
   `;
};

// export function sendResetPassword(email, token) {
//   const cid = uuid.v4();
//    return sendMail(cid, {
//       from: 'habla-mailer-dev@habla.ai',
//       to: email,
//       subject: 'Reset Your Habla Password',
//       html: htmlContents(cid, `
//            <br>Thank you for using Habla AI.<br>
//            <br>Please click on this <a href="http://habla.io">link</a> to reset your Habla password.<br>`)
//    });
// }

export const sendActivationLink = (email, rid) => {
   const cid = uuid.v4();
   const html = htmlContents(cid,
       `<br>Thank you for registering for Habla AI.<br>
        <br>Please <a href="${config.webappBaseUri}/verifyAccount/${rid}">click here</a> to activate your account.<br>`);
   return sendMail(cid, {
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: 'Your Habla.ai Account',
      html
   });
};

export const sendSubscriberOrgInviteToExternalUser = (email, subscriberOrgName, byUserInfo, rid) => {
   const cid = uuid.v4();
   const html = htmlContents(cid,
      `<br>${byUserInfo.firstName} ${byUserInfo.lastName} has invited you to "${subscriberOrgName}" in Habla AI.<br>
       <br>Please <a href="${config.webappBaseUri}/signup/${rid}">click here</a> to activate your account and join them.<br>`);
   return sendMail(cid, {
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: `Invitation to join "${subscriberOrgName}" on Habla.ai`,
      html,
   });
};

export const sendSubscriberOrgInviteToExistingUser = (email, subscriberOrgName, byUserInfo, key) => {
   const webKey = key.split('=')[1];
   const cid = uuid.v4();
   const html = htmlContents(cid,
      `<br>${byUserInfo.firstName} ${byUserInfo.lastName} has invited you to "${subscriberOrgName}" on Habla AI.<br>
       <br>Please <a href="${config.webappBaseUri}/app/acceptinvitation/subscriberOrg/${webKey}">click here</a> to join them.<br>`);
   return sendMail(cid, {
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: `Invitation to join "${subscriberOrgName}" on Habla.ai`,
      html
   });
};

export const sendTeamInviteToExistingUser = (email, subscriberOrgName, teamName, byUserInfo, key) => {
   const webKey = key.split('=')[1];
   const cid = uuid.v4();
   const html = htmlContents(cid,
      `<br>${byUserInfo.firstName} ${byUserInfo.lastName} has invited you to team "${teamName}" of "${subscriberOrgName}" in Habla AI.<br>
       <br>Please <a href="${config.webappBaseUri}/app/acceptinvitation/team/${webKey}">click here</a> to join them.<br>`);
   return sendMail(cid, {
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: `Invitation to join "${teamName}" of "${subscriberOrgName}" on Habla AI`,
      html
   });
};

export const sendTeamRoomInviteToExistingUser = (email, subscriberOrgName, teamName, teamRoomName, byUserInfo, key) => {
   const webKey = key.split('=')[1];
   const cid = uuid.v4();
   const html = htmlContents(cid,
      `<br>${byUserInfo.firstName} ${byUserInfo.lastName} has invited you to team room "${teamRoomName}" of "${subscriberOrgName}" in Habla AI.<br>
       <br>Please <a href="${config.webappBaseUri}/app/acceptinvitation/teamRoom/${webKey}">click here</a> to join them.<br>`);
   return sendMail(cid, {
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: `Invitation to join "${teamRoomName}" of "${subscriberOrgName}" on Habla.ai`,
      html
   });
};

