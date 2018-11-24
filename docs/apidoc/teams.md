# Teams endpoints.

## Update Team [PATCH]

### URI Format
 `{{host}}/v2/organization/{orgId}/teams/{teamId}`

### Request Body Format
All parameters are optionals

```javascript
{
    "active": Boolean,
    "name": String,
    "icon": String,
    "preferences": Object
}
```

### Response Body Format
```javascript
{
    "active": Boolean,
    "subscriberOrgEnabled": Boolean,
    "icon": String,
    "v": Number,
    "lastModified": String,
    "created": String,
    "subscriberOrgId": String,
    "preferences": Object,
    "teamId": String,
    "name": String,
    "primary": Boolean
}
```

### Request example

```
curl -X PATCH \
  https://habla-fe-api-sjdev.habla.ai/v2/organization/3fad347a-f87b-497f-a575-370cbec389d1/teams/923ac3cc-bfe9-4fb9-b375-fc41b22c75ac \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiIwZDFhNTEyZC03ZTc4LTQxOGEtYmNhMy02NTBjMzFjNTk5ZjMiLCJlbWFpbCI6ImpvbmF0YW4uZnJhbmtAaGFibGEuaW8iLCJfc3JjIjp7InVzZXJJZCI6IjBkMWE1MTJkLTdlNzgtNDE4YS1iY2EzLTY1MGMzMWM1OTlmMyIsImFkZHJlc3MiOiI6OjEiLCJ1c2VyQWdlbnQiOiJNb3ppbGxhLzUuMCAoWDExOyBMaW51eCB4ODZfNjQ7IHJ2OjYyLjApIEdlY2tvLzIwMTAwMTAxIEZpcmVmb3gvNjIuMCJ9LCJpYXQiOjE1MzY4MDE5Mzl9.tZ6Y_bQANQpMdwwyoO9wmdDpa_nYMn-peGmN6N2IIEk' \
  -H 'Content-Type: application/json' \
  -d '{
	"name": "new Name",
	"active": false
}'
```

```javascript
{
    "active": false,
    "subscriberOrgEnabled": true,
    "icon": null,
    "v": 1,
    "lastModified": "2018-10-10T23:18:49Z",
    "created": "2018-09-13T01:25:30Z",
    "subscriberOrgId": "3fad347a-f87b-497f-a575-370cbec389d1",
    "preferences": {
        "iconColor": "#FBBC12",
        "private": {}
    },
    "teamId": "923ac3cc-bfe9-4fb9-b375-fc41b22c75ac",
    "name": "new Name 2",
    "primary": true
}
```

## Update Team Member [PATCH]

### URI Format
`{host}/v2/organization/{orgId}/teams/{teamId}/users/{userId}`

### Request Body Format
Right now the only field we allow to update is active

```javascript
{
    "active": false
}
```

### Response Body Format
```javascript
{
    "userId": String,
    "teamId": String,
    "orgId": String,
    "role": String,
    "active": Boolean
}
```

### Request Example

```
curl -X PATCH \
  https://habla-fe-api-sjdev.habla.ai/v2/organization/3fad347a-f87b-497f-a575-370cbec389d1/teams/923ac3cc-bfe9-4fb9-b375-fc41b22c75ac/users/0d1a512d-7e78-418a-bca3-650c31c599f3 \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiIwZDFhNTEyZC03ZTc4LTQxOGEtYmNhMy02NTBjMzFjNTk5ZjMiLCJlbWFpbCI6ImpvbmF0YW4uZnJhbmtAaGFibGEuaW8iLCJfc3JjIjp7InVzZXJJZCI6IjBkMWE1MTJkLTdlNzgtNDE4YS1iY2EzLTY1MGMzMWM1OTlmMyIsImFkZHJlc3MiOiIyMDAuMTE3LjE0OC4xODgiLCJ1c2VyQWdlbnQiOiJNb3ppbGxhLzUuMCAoWDExOyBMaW51eCB4ODZfNjQpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS82OS4wLjM0OTcuOTIgU2FmYXJpLzUzNy4zNiJ9LCJpYXQiOjE1Mzk5OTQwMTN9.M8HkF5bK6MTj4GJVnvMduMjDxTr8DXMC3p9pXS8iBQ0' \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -d '{
	"active": false
} '
```

```javascript
{
    "userId": "0d1a512d-7e78-418a-bca3-650c31c599f3",
    "teamId": "923ac3cc-bfe9-4fb9-b375-fc41b22c75ac",
    "orgId": "3fad347a-f87b-497f-a575-370cbec389d1",
    "role": "admin",
    "active": false
}
```