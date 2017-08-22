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

tblSubscriberUsers = dynamodb.Table('BETA_subscriberUsers')
tblTeamMembers = dynamodb.Table('BETA_teamMembers')
tblTeamRoomMembers = dynamodb.Table('BETA_teamRoomMembers')
tblConversationParticipants = dynamodb.Table('BETA_conversationParticipants')

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
            
    #now check each subscriberUser
    qryOrgUsers = tblSubscriberUsers.scan(
            FilterExpression=Attr('subscriberUserInfo.subscriberOrgId').eq(orgId)
            )
    orgUsers = qryOrgUsers['Items']      
    
    for user in orgUsers:
        curSubUserId = user['subscriberUserId']
        curUserId = user['subscriberUserInfo']['userId']
        
        print('SUBSCRIBERUSER:', curSubUserId, curUserId)
        
        #check to see if they are in the default team in teamMembers
        qryTeamMembers = tblTeamMembers.scan(
                FilterExpression=Attr('teamMemberInfo.teamId').eq(defTeamId) &
                    Attr('teamMemberInfo.subscriberUserId').eq(curSubUserId)
                )
        teamMembers = qryTeamMembers['Items']

        if (len(teamMembers) > 0 ):
            print('Team Member Found!')
        else:
            print('Team Member Not Found!')
          
        #check to see if in teamRoomMembers
        qryTeamRoomMembers = tblTeamRoomMembers.scan(
                FilterExpression=Attr('teamRoomMemberInfo.teamRoomId').eq(defTeamRoomId) &
                    Attr('teamRoomMemberInfo.userId').eq(curUserId)
                )
        teamRoomMembers = qryTeamRoomMembers['Items']

        if (len(teamRoomMembers) > 0 ):
            print('TeamRoom Member Found!')
        else:
            print('TeamRoom Member Not Found!')       
        
        
        #now get the default conversation for the teamRoom
        qryConversations = tblConversations.scan(
                FilterExpression=Attr('conversationInfo.teamRoomId').eq(defTeamRoomId)
                )
        conversations = qryConversations['Items']

        if (len(conversations) > 0 ):
            print('Conversation Found!')
            for conversation in conversations:
                convId = conversation['conversationId']
        else:
            print('Conversation Not Found!')       
        
        
        #check to see if in conversationParticipants

        qryConversationParticipants = tblConversationParticipants.scan(
                FilterExpression=Attr('conversationParticipantInfo.conversationId').eq(convId) &
                    Attr('conversationParticipantInfo.userId').eq(curUserId)
                )
        conversationParticipants = qryConversationParticipants['Items']

        if (len(conversationParticipants) > 0 ):
            print('ConversationParticipant Found!')
        else:
            print('ConversationParticipant Not Found!')          
        
        
            