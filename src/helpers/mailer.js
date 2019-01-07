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
     This email was sent to you because your email is registered in Habla AI. If this wasn’t you, please email us at <a href="mailto:support@habla.ai">support@habla.ai</a> so we can help.
     </div>
   `;
};

export const sendConfirmationCode = (email, rid) => {
   const cid = uuid.v4();
   const html = htmlContents(cid,
       `<br>Thank you for signing up for Habla AI.
        <br>Get ready for Freedom from Project Team File Anxiety and Chaos!<br>
        <br>Enter the following code in the window where you began creating your new
        Habla AI account:<br>
        <h1>${rid}</h1>
        <br>This email contains private information for your Habla AI account — please
        don’t forward it. Questions about setting up Habla AI? Email us at
        <a href="mailto:support@habla.ai">support@habla.ai</a> or submit a support request <a href="https://helpcenter.habla.ai" target="_blank">here</a>.<br>`);
   return sendMail(cid, {
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: 'Habla AI Confirmation Code',
      html
   });
};

export const sendResetPassword = (email, rid) => {
   const cid = uuid.v4();
   const url = `${config.webappBaseUri}/setNewPassword/${rid}`;
   const html = htmlContents(cid,
      `<br>Reset Password<br>
        <br>Please click on the following link to reset your password:<br>
        <br> <a href="${url}">${url}</a><br>`);
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
      `<br>${byUserInfo.firstName} ${byUserInfo.lastName} has invited you to join the "${subscriberOrgName}" organization in Habla AI.<br>
       <br>Please <a href="${config.webappBaseUri}/verifyAccount/${rid}">click here</a> to activate your account and setup your Company’s Organization and first Project Team. Here is a link to our Help Center with everything you need to know to Get Started <a href="https://www.habla.ai/help-center.html" target="_blank">www.habla.ai/help-center.html</a><br>
       <br>If you have any other questions please contact us at <a href="mailto:support@habla.ai">support@habla.ai</a><br>`);
   return sendMail(cid, {
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: `Invitation to join "${subscriberOrgName}" Company Organization`,
      html,
   });
};

export const sendSubscriberOrgInviteToExistingUser = (email, subscriberOrgName, byUserInfo, invitedUserInfo, key) => {
   const webKey = key.split('=')[1];
   const cid = uuid.v4();
   const html = htmlContents(cid,
      `<br>Hi ${invitedUserInfo.firstName},</br>
       <br>${byUserInfo.firstName} ${byUserInfo.lastName} has invited you to the "${subscriberOrgName}" organization in Habla AI.<br>
       <br>Please <a href="${config.webappBaseUri}/app/acceptinvitation/subscriberOrg/${webKey}">click here</a> to join them.<br>`);
   return sendMail(cid, {
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: `Invitation to join "${subscriberOrgName}" on Habla.ai`,
      html
   });
};

export const sendTeamInviteToExistingUser = (email, subscriberOrgName, teamName, byUserInfo, invitedUserInfo, key) => {
   const webKey = key.split('=')[1];
   const cid = uuid.v4();
   const html = htmlContents(cid,
      `<br>Hi ${invitedUserInfo.firstName},</br>
       <br>${byUserInfo.firstName} ${byUserInfo.lastName} has invited you to the "${teamName}" team in the "${subscriberOrgName}" organization. Please join the project team, start sharing all your files and data relevant to the team, Smart Search, find, knowledge graph, and gain back hours every month in precious time.<br>
       <br>Please <a href="${config.webappBaseUri}/app/acceptinvitation/team/${webKey}">click here</a> to join them.<br>`);
   return sendMail(cid, {
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: `Invitation to join Project Team "${teamName}" of "${subscriberOrgName}" on Habla AI`,
      html
   });
};

export const sendTeamRoomInviteToExistingUser = (email, subscriberOrgName, teamName, teamRoomName, byUserInfo, invitedUserInfo, key) => {
   const webKey = key.split('=')[1];
   const cid = uuid.v4();
   const html = htmlContents(cid,
      `<br>Hi ${invitedUserInfo.firstName},</br>
       <br>${byUserInfo.firstName} ${byUserInfo.lastName} has invited you to the "${teamName}" team's "${teamRoomName}" room in the "${subscriberOrgName}" organization.<br>
       <br>Please <a href="${config.webappBaseUri}/app/acceptinvitation/teamRoom/${webKey}">click here</a> to join them.<br>`);
   return sendMail(cid, {
      from: 'habla-mailer-dev@habla.ai',
      to: email,
      subject: `Invitation to join "${teamRoomName}" of "${subscriberOrgName}" on Habla.ai`,
      html
   });
};

export const sendNewUserDataToAdmin = (byUserInfo) => {
   const cid = uuid.v4();
   const html = htmlContents(cid,
      `<br>${byUserInfo.firstName} ${byUserInfo.lastName} (${byUserInfo.email}) registered with the 'Getting Started for 30 Days Free Plan'<br>`);
   return sendMail(cid, {
      from: 'habla-mailer-dev@habla.ai',
      to: config.notificationEmail,
      subject: `A New User has been registered to Get Started for a 30 Days Free Plan at Habla AI`,
      html,
   });
};
