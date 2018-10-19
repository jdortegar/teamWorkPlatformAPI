# Habla API

## Requirements

* Node.js v6 (We should update this soon)
* Redis 
* AWS CLI

## Running server

```
$ npm start
```

## API Documentation
Replace `{host}` whith the running instance host of the api:
*  *Local:* `http://localhost:3000/`
* *Dev:* `https//habla-fe-api-sjdev.habla.ai/`
* *Demo:* `https://habla-fe-api-sjdemo.habla.ai`

### Intetgrations

#### Get Integrations [GET]

|            | Organization Level                                           | Team level Integratios                                     |
|------------|:------------------------------------------------------------:|-----------------------------------------------------------:|
|**URI**     | `{host}/v1/getIntegrations?subscriberOrgId={subscriberOrgId}`| `{host}/v2/organization/{orgId}/team/{teamId}/integrations`|
|**Security**| Secured                                                      | Secured                                                    |                       

##### Response format

**Team Level**
```javascript
{
    "teamMemberIntegrations": [
        {
            "integrations": {
                "box": {
                    "acquiredAtMS": 1534868020463, 
                    "expired": false, 
                    "userId": "3547876026", 
                    "accessTokenTTLMS": 4186000
                },
                "dropbox": {
                    "revoked": true
                },
            },
            "teamId": "923ac3cc-bfe9-4fb9-b375-fc41b22c75ac",
            "userId": "0d1a512d-7e78-418a-bca3-650c31c599f3"
        },
        {
            "integrations": {
                "google": {
                    "expired": false, 
                    "expiry_date": 1538062479898,
                    "scope": "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.install https://www.googleapis.com/auth/drive.readonly"
                    "userId": "101693230268909862812"
                },
                "salesforce": {
                    "access_token": "00Df2000001Gfi6!AR4AQGinlpg27JGilgsk0ICyJu36cpGp1SzXw.PcsM54_i92tMlSwDn6aN.Yejdj2e0DB7FLr3igWwBCsbarTuaGxZdnTE2u"
                    "expired": false
                    "id": "https://login.salesforce.com/id/00Df2000001Gfi6EAC/005f2000008kDZ0AAM"
                    "id_token": "eyJraWQiOiIyMTQiLCJ0eXAiOiJKV1Q...."
                    "instance_url": "https://na53.salesforce.com"
                    "issued_at": "1530818690215"
                    "scope": "full"
                    "signature": "gUbBmZkgAQBzbxDDmXHISS39QS8sjX+Z5VKK2KTc79Y="
                    "token_type": "Bearer"
                    "userId": "https://login.salesforce.com/id/00Df2000001Gfi6EAC/005f2000008kDZ0AAM"

                }
            }
            "teamId": "923ac3cc-bfe9-4fb9-b375-fc41b22c75ac",
            "userId": "df456-7e78-2546-bca3-650c31c599f3"
        }
    ]
}
```

### Integrate [GET]

|            | Organization Level                                                  | Team Level                                                                      |
|------------|:-------------------------------------------------------------------:|--------------------------------------------------------------------------------:|
|**URI**     |`{{host}}/integrations/{integrationName}/integrate/{subscriberOrgId}`| `{{host}}/integrations/{integrationName}/integrate/{teamId}?temLevel=1`| 
|**Security**| Secured                                                             | Secured                                                                         |

#### Response Format

```javascript
{
    "location": "https://accounts.google.com/o/oauth2/auth?access_type=offline&approval_prompt=force&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.install&state=4f1f3cc0-0f45-491a-b88f-ce7fd235fb2c&response_type=code&client_id=801943186202-5cp3slnr8mi8vmtdruiessk3i5ugneg0.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fintegrations%2Fgoogle%2Faccess"
}
```

#### Revoke [POST]


|            | Organization Level                                               | Team Level                                                                      |
|------------|:----------------------------------------------------------------:|--------------------------------------------------------------------------------:|
|**URI**     |`{{host}}/integrations/{integrationName}/revoke/{subscriberOrgId}`| `{{host}}/integrations/{integrationName}/revoke/{subscriberOrgId}?temLevel=1?teamlevel=1&teamId={teamId}`| 
|**Security**| Secured                                                          | Secured                                                                         |

##### Response Format

Response has no content
