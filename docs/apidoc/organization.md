# Organization Endpoints

## Get Org Teams and Integrations [GET]

### URI Format 
`{host}/v2/organization/{orgId}`

### Response Body Format

```javascript
{
    "orgId": String,
    "name": String,
    "integrations" Object,
    "teams": [
        {
            "teamId": String,
            "name": String,
            "preferences": Object,
            "primary": Boolean,
            "active": Boolean,
            "teamMembers"[
                {
                    "userId": String,
                    "active": Boolean,
                    "role": String,
                    "integrations": Object
                }
            ]
        }
    ]
}
```
### Request Example

```
curl -X GET \
  http://habla-fe-api-sjdev.habla.ai/v2/organizations/3fad347a-f87b-497f-a575-370cbec389d1 \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiIwZDFhNTEyZC03ZTc4LTQxOGEtYmNhMy02NTBjMzFjNTk5ZjMiLCJlbWFpbCI6ImpvbmF0YW4uZnJhbmtAaGFibGEuaW8iLCJfc3JjIjp7InVzZXJJZCI6IjBkMWE1MTJkLTdlNzgtNDE4YS1iY2EzLTY1MGMzMWM1OTlmMyIsImFkZHJlc3MiOiI6OjEiLCJ1c2VyQWdlbnQiOiJNb3ppbGxhLzUuMCAoWDExOyBMaW51eCB4ODZfNjQ7IHJ2OjYyLjApIEdlY2tvLzIwMTAwMTAxIEZpcmVmb3gvNjIuMCJ9LCJpYXQiOjE1MzY4MDE5Mzl9.tZ6Y_bQANQpMdwwyoO9wmdDpa_nYMn-peGmN6N2IIEk' \
  -H 'cache-control: no-cache'
```

```javascript
{
    "orgId": "3fad347a-f87b-497f-a575-370cbec389d1",
    "name": "jonatan.frank@habla.io",
    "integrations": {
        "dropbox": {
            "revoked": true
        },
        "google": {
            "revoked": true
        }
    },
    "teams": [
        {
            "teamId": "923ac3cc-bfe9-4fb9-b375-fc41b22c75ac",
            "name": "new Name",
            "preferences": {
                "iconColor": "#FBBC12",
                "private": {}
            },
            "primary": true,
            "active": false,
            "teamMembers": [
                {
                    "userId": "0d1a512d-7e78-418a-bca3-650c31c599f3",
                    "active": false,
                    "role": "admin",
                    "integrations": {
                        "dropbox": {
                            "revoked": true
                        },
                        "google": {
                            "revoked": true
                        }
                    }
                }
            ]
        }
    ]
}