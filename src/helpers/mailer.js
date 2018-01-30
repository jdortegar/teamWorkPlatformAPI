/* eslint-disable max-len */
import AWS from 'aws-sdk';
import nodemailer from 'nodemailer';
import uuid from 'uuid';
import config from '../config/env';

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
     <h1><img src="cid:${cid}" width="125" height="35"></h1>
     <div style="border: 2px solid lightgray; border-radius: 8px; padding: 30px; padding-top: 10px; padding-bottom: 20px; width: 400; font-size: 16; font-family: 'Arial'">
       ${html}
     </div>
     <div style="padding-top: 20px; width: 400; font-family: 'Arial'; color: lightslategray; font-size: 12">
       This email was sent because your email is registered in Habla AI.
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

export const sendResetPassword = (email, rid) => {
   const cid = uuid.v4();
   const html = htmlContents(cid,
      `<br>Reset Password<br>
        <br>Please click on the following link to reset your password:<br>
         <br> <a href="${config.webappBaseUri}/resetPassword/${rid}">${config.webappBaseUri}/resetPassword/${rid}</a><br>`);
   return sendMail(cid, {
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: 'Reset Password',
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

