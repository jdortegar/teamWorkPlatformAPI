# -*- coding: utf-8 -*-df3
"""
Spyder Editor

This is a temporary script file.
"""

import boto3
from boto3.dynamodb.conditions import Key, Attr


dynamodb = boto3.resource('dynamodb')

tblOrgs = dynamodb.Table('BETA_subscriberOrgs')
tblTeams = dynamodb.Table('BETA_teams')
tblTeamRooms = dynamodb.Table('BETA_teamRooms')
tblConversations = dynamodb.Table('BETA_conversations')

qryOrgs = tblOrgs.scan(
        FilterExpression=Attr('subscriberOrgInfo.enabled').eq(True)
        )
orgs = qryOrgs['Items']

#for each enabled org:
for org in orgs:
    #first, get the orgId
    orgId = org['subscriberOrgId']
    orgName = org['subscriberOrgInfo']['name']
    print('ORG:', orgId, orgName)
    
    #now, use the orgId to find the default team
    qryDefTeam = tblTeams.scan(
            FilterExpression=Attr('teamInfo.subscriberOrgId').eq(orgId) &
                Attr('teamInfo.primary').eq(True) &
                Attr('teamInfo.active').eq(True)
            )
    teams = qryDefTeam['Items']
    
    for team in teams:
        #print(team)
        defTeamId = team['teamId']
        defTeamName = team['teamInfo']['name']
        print('TEAM:', defTeamId, defTeamName)
        
        #and use the defTeamId to find the default teamRoom
        qryDefTeamRoom = tblTeamRooms.scan(
                FilterExpression=Attr('teamRoomInfo.teamId').eq(defTeamId) &
                    Attr('teamRoomInfo.primary').eq(True) &
                    Attr('teamRoomInfo.active').eq(True)
                )
        teamRooms = qryDefTeamRoom['Items']   
        
        #print(defTeamRoom)
        for teamRoom in teamRooms:
            defTeamRoomId = teamRoom['teamRoomId']
            defTeamRoomName = teamRoom['teamRoomInfo']['name']
            print('TEAMROOM:', defTeamRoomId, defTeamRoomName)