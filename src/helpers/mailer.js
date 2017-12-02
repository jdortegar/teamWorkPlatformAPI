/* eslint-disable max-len */
import AWS from 'aws-sdk';
import nodemailer from 'nodemailer';
import uuid from 'uuid';
import config from '../config/env';
import mailerLogoBase64 from './mailerLogo';

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
         filename: false,
         cid,
         encoding: 'base64',
         contentType: 'image/gif',
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

const contentsBefore = (cid) => {
   return `
     <style type="text/css">.boxed {border: 2px solid lightgray; border-radius: 8px; padding: 40px; padding-top: 20px; width: 300; font-family: 'Arial'}</style>
     <h1><img src="cid:${cid}" width="200" height="56"></h1>
     <div class="boxed">`;
};

const contentsAfter = '</div>';

// export function sendResetPassword(email, token) {
//   const cid = uuid.v4();
//    return sendMail(cid, {
//       from: 'habla-mailer-dev@habla.ai',
//       to: email,
//       subject: 'Reset Your Habla Password',
//       html: `
//          ${contentsBefore(cid)}
//            <br>Thank you for using Habla AI.<br>
//            <br>Please click on this <a href="http://habla.io">link</a> to reset your Habla password.<br>
//          ${contentsAfter}
//       `
//    });
// }

export const sendActivationLink = (email, rid) => {
   const cid = uuid.v4();
   const html = `
      ${contentsBefore(cid)}
        <br>Thank you for registering for Habla AI.<br>
        <br>Please <a href="${config.webappBaseUri}/verifyAccount/${rid}">click here</a> to activate your account.<br>
      ${contentsAfter}
   `;
   return sendMail(cid, {
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: 'Your Habla.ai Account',
      html
   });
};

export const sendSubscriberOrgInviteToExternalUser = (email, subscriberOrgName, byUserInfo, rid) => {
   const cid = uuid.v4();
   const html = `
      ${contentsBefore(cid)}
        <br>${byUserInfo.firstName} ${byUserInfo.lastName} has invited you to "${subscriberOrgName}" in Habla AI.<br>
        <br>Please <a href="${config.webappBaseUri}/signup/${rid}">click here</a> to activate your account and join them.<br>
      ${contentsAfter}
   `;
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
   const html = `
      ${contentsBefore(cid)}
        <br>${byUserInfo.firstName} ${byUserInfo.lastName} has invited you to "${subscriberOrgName}" on Habla AI.<br>
        <br>Please <a href="${config.webappBaseUri}/app/acceptinvitation/subscriberOrg/${webKey}">click here</a> to join them.<br>
      ${contentsAfter}
   `;
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
   const html = `
      ${contentsBefore(cid)}
        <br>${byUserInfo.firstName} ${byUserInfo.lastName} has invited you to team "${teamName}" of "${subscriberOrgName}" in Habla AI.<br>
        <br>Please <a href="${config.webappBaseUri}/app/acceptinvitation/team/${webKey}">click here</a> to join them.<br>
      ${contentsAfter}
      `;
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
   const html = `
      ${contentsBefore(cid)}
        <br>${byUserInfo.firstName} ${byUserInfo.lastName} has invited you to team room "${teamRoomName}" of "${subscriberOrgName}" in Habla AI.<br>
        <br>Please <a href="${config.webappBaseUri}/app/acceptinvitation/teamRoom/${webKey}">click here</a> to join them.<br>
      ${contentsAfter}
      `;
   return sendMail(cid, {
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: `Invitation to join "${teamRoomName}" of "${subscriberOrgName}" on Habla.ai`,
      html
   });
};

