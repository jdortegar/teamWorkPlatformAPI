//import bootstrap from '../../src/bootstrap';
import AWS from 'aws-sdk';
import { getTeamsByIds, getTeamMembersBySubscriberUserIds, getSubscriberUsersByUserIds } from '../../src/services/util';
import config from '../../src/config/env';
import teamSvc from '../../src/services/teamService';

function setup() {
   AWS.config.update({
   	 region: config.aws.awsRegion,
   	 endpoint: config.dynamoDbEndpoint
  	});
   const docClient = new AWS.DynamoDB.DocumentClient();
}

test.skip('Get subscriberUsers of a specified user.', async () => {
   setup();
   const subscriberUsers = await getSubscriberUsersByUserIds({}, ['ea794510-cea6-4132-ae22-a7ae1d32abb5'], undefined);
 	console.log(`AD: subscriberUsers=${subscriberUsers}`);
});

test.skip('Get teamMembers of a specified subscriberUser.', async () => {
   setup();
   const teamMembers = await getTeamMembersBySubscriberUserIds({}, [ 'ea794510-cea6-4132-ae22-a7ae1d32abb4', 'ea794510-cea6-4132-ae22-a7ae1d32abb7']);
 	console.log(`AD: teamMembers=${JSON.stringify(teamMembers)}`);
});

test.skip('Get teams by ids.', async () => {
   setup();
   const teams = await getTeamsByIds({ app: { locals: { db: new AWS.DynamoDB() } } }, ['ea794510-cea6-4132-ae22-a7ae1d321111', 'ea794510-cea6-4132-ae22-a7ae1d321112']);
 	console.log(`AD: teams=${JSON.stringify(teams)}`);
});

test.skip('Get teams by userId.', async () => {
   setup();

   const req = { app: { locals: { db: new AWS.DynamoDB() } } };
   const teams = await getSubscriberUsersByUserIds(req, ['ea794510-cea6-4132-ae22-a7ae1d32abb5'])
      .then((subscriberUsers) => {
         console.log(`AD: subscriberUsers=${JSON.stringify(subscriberUsers)}`);
         const subscriberUserIds = subscriberUsers.map((subscriberUser) => subscriberUser.subscriberUserId);
         console.log(`AD: subscriberUserIds=${JSON.stringify(subscriberUserIds)}`);
         return getTeamMembersBySubscriberUserIds(req, subscriberUserIds);
      })
      .then((teamMembers) => {
         console.log(`AD: teamMembers=${JSON.stringify(teamMembers)}`);
         const teamIds = teamMembers.map((teamMember) => {
            return teamMember.teamMemberInfo.teamId;
         });
         console.log(`AD: teamIds=${JSON.stringify(teamIds)}`);
         return getTeamsByIds(req, teamIds);
      })
      .then((teams) => {
         console.log(`AD: teams=${JSON.stringify(teams)}`);
         // "name": "Posse",
         //    "purpose": "Place to hang.",
         //    "teamId": "9dec8947-0381-4809-a053-b56777f782f4",
         //    "publish": false,
         //    "active": true
         const apiTeams = teams.map((team) => {
            console.log(`AD: team=${JSON.stringify(team.teamInfo.M)}`);
            //const apiTeam = { name, purpose } = team.teamInfo.M;
         });
         const ret = { teams: apiTeams };
         console.log(`AD: ret=${ret}`);
      })
      .catch((err) => console.error(err));
});

test.skip('Get teams by userId from teamService.', async () => {
   setup();

   const req = { app: { locals: { db: new AWS.DynamoDB() } } };
   const userId = 'ea794510-cea6-4132-ae22-a7ae1d32abb5';
   const teams = await teamSvc.getUserTeams(req, userId);
   console.log(JSON.stringify(teams));
});

function removeIntermediateDataType2(obj) {
   if (typeof obj !== 'object') {
      return obj;
   }

   let ret;
   const objKeys = Object.keys(obj);
   if (objKeys.length !== 1) {
      ret = {};
      for (const objKey of objKeys) {
         ret[objKey] = removeIntermediateDataType2(obj[objKey]);
      }
      return ret;
   } else {
      const objKey = objKeys[0];
      const value = obj[objKey];
      switch (objKey) {
         case 'N':
            return Number(value);
         case 'M':
            ret = {};
            for (const subKey of Object.keys(value)) {
               ret[subKey] = removeIntermediateDataType2(value[subKey]);
            }
            return ret;
         case 'S':
            return value;
         case 'BOOL':
            return Boolean(value);
         default:
            ret = {};
            ret[objKey] = removeIntermediateDataType2(value);
            console.log(`objKey=${objKey}, value=${value}, ret[objKey]=${ret[objKey]}`);
            return ret;
      }
   }
}

test.skip('removeIntermediateDataTypes.', async () => {
   const example = '{"teamInfo":{"M":{"name":{"S":"A Team"},"active":{"BOOL":true},"purpose":{"S":"Do something"},"subscriberOrgId":{"S":"ea794510-cea6-4132-ae22-a7ae1d324400"},"publish":{"BOOL":true}}},"partitionId":{"N":"-1"},"teamId":{"S":"ea794510-cea6-4132-ae22-a7ae1d321111"}}';
   const obj = JSON.parse(example);
   const final = removeIntermediateDataType2(obj);
   console.log(`------>${JSON.stringify(final)}`);
});
