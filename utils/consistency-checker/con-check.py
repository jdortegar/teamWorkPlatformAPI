# -*- coding: utf-8 -*-df3
"""
Spyder Editor

This is a temporary script file.
"""

import boto3
from boto3.dynamodb.conditions import Key, Attr
import uuid
import json

def fixupRecs(event, context):
    tblPrefix = 'BETA_'
    
    
    dynamodb = boto3.resource('dynamodb')
    
    tblOrgs = dynamodb.Table(tblPrefix+'subscriberOrgs')
    tblTeams = dynamodb.Table(tblPrefix+'teams')
    tblTeamRooms = dynamodb.Table(tblPrefix+'teamRooms')
    tblConversations = dynamodb.Table(tblPrefix+'conversations')
    
    tblSubscriberUsers = dynamodb.Table(tblPrefix+'subscriberUsers')
    tblTeamMembers = dynamodb.Table(tblPrefix+'teamMembers')
    tblTeamRoomMembers = dynamodb.Table(tblPrefix+'teamRoomMembers')
    tblConversationParticipants = dynamodb.Table(tblPrefix+'conversationParticipants')
    
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
                
                for member in teamMembers:
                    teamMemberId = member['teamMemberId']
            else:
                print('Team Member Not Found!')
                #need to create a teamMembers record
    #            {
    #              "partitionId": -1,
    #              "teamMemberId": "18f23d87-732d-4f6f-8a12-713fba9eca63",
    #              "teamMemberInfo": {
    #                "role": "user",
    #                "subscriberUserId": "7a5ad7ea-ed8a-4f7c-a516-6183dde1c895",
    #                "teamId": "68ea4bb7-9a8a-4b75-a605-50398c25bbde",
    #                "userId": "da4e627e-606f-495e-aba3-053358b5c523"
    #              }
    #            }
                #first, create the teamMemberInfo record
                teamMemberId = uuid.uuid1()
                
                teamMemberInfo = {
                            "role" : "user",
                            "subscriberUserId" : curSubUserId,
                            "teamId" : defTeamId,
                            "userId" : curUserId
                        }
                
                teamMember = {
                            "partitionId" : -1,
                            "teamMemberId" : str(teamMemberId),
                            "teamMemberInfo" : teamMemberInfo
                        }
                
                print('New Team Member:', teamMember)
                tblTeamMembers.put_item (
                        Item = teamMember)
                
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
                #need to create the teamRoomMemberInfo record            
    #            {
    #              "partitionId": -1,
    #              "teamRoomMemberId": "0b6ce7dc-3405-4a78-a269-6d55842742c3",
    #              "teamRoomMemberInfo": {
    #                "role": "admin",
    #                "teamMemberId": "253479d4-bb3f-4d46-92bd-d9c2585575fa",
    #                "teamRoomId": "e1c85c3f-1a22-4c96-a6f8-0cb5a6054822",
    #                "userId": "60076e82-e048-4374-aec2-c30c7ae9197e"
    #              }
    #            }
                
                teamRoomMemberId = uuid.uuid1()
                
                teamRoomMemberInfo = {
                        "role" : "user", 
                        "teamMemberId" : str(teamMemberId),
                        "teamRoomId" : defTeamRoomId,
                        "userId" : curUserId
                        
                        }
                
                teamRoomMember = {
                        "partitionId" : -1,
                        "teamRoomMemberId" : str(teamRoomMemberId),
                        "teamRoomMemberInfo" : teamRoomMemberInfo
                        }
                
                print('New TeamRoomMember: ', teamRoomMember)
                tblTeamRoomMembers.put_item (
                        Item=teamRoomMember
                        )
                
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
    #            {
    #              "conversationParticipantId": "1c78ffb9-f5f7-4e68-afe6-bbcfb02f1dd3",
    #              "conversationParticipantInfo": {
    #                "conversationId": "86ef27e6-bc8f-4602-87de-a46885c8d7fa",
    #                "userId": "c06a4153-79cd-4d65-b752-a4510fe035ca"
    #              },
    #              "partitionId": -1
    #            }        
                conversationParticipantId = uuid.uuid1()
                
                conversationParticipantInfo = {
                        "conversationId" : convId,
                        "userId" : curUserId
                        }
                
                conversationParticipant = {
                        "partitionId" : -1,
                        "conversationParticipantId" : str(conversationParticipantId),
                        "conversationParticipantInfo" : conversationParticipantInfo
                        }
                
                print('New ConversationParticipant: ', conversationParticipant)
                tblConversationParticipants.put_item(
                    Item=conversationParticipant
                    )
                
    body = {
        "message": "fixupRecs completed successfully!",
        "input": event
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
                