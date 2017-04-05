# Auth API

TODO: description here.

> **Additional Possible Responses for all endpoints**
>
> Code | Description | Headers | Body | Example
> ---- | ----------- | ------- | ---- | -------
> | 503  | SERVICE_UNAVAILABLE<br />A server error has occurred, typically Redis, DynamoDB, or other remote service availability. | N/A | { message: '${error}' } | N/A
> | 500  | INTERNAL\_SERVER\_ERROR<br />A server error has occurred, typically unforseen or unaccounted for.<br />Most likely a logic error 'cause we're not perfect. | N/A | { message: '${error}' } | N/A

**Version** 0.1.6

## Paths

#### /auth/login
> ```
> POST /auth/login
> ```
> **Summary**
>
> Login to Habla API, receiving a JWT token for use in authenticated requests.
>
> **Description**
>
> Endpoint to retrieve a JWT token for use in authenticated requests.
> <br />
> Returns a valid [JWT token](http://jwt.io), along with public user details if successful (200-OK).
> This token must be stored for future API requests.
> <br />
> A token will expire after a customer-specified session timeout (1 hour by default).
> A logout function may be implemented client-side that destroys the token in the client framework; however, the token will remain active until its expiry time has been exceeded.
> For this reason, it is recommended that the token be stored in a secure cookie on web clients or some secure storage mechanism for other applications.
> <br />
> For security reasons, separate messages will not be provided for user not found versus authentication failure.
> This is to prevent information leakage to malicious users.
>
> **Request Headers**
>
> Name | Value | Example
> ---- | ----- | -------
> Content-Type | application/x-www-form-urlencoded | N/A 
>
> **URL Path Values**
>
> N/A
>
> **URL Parameters**
>
> N/A
>
> **Body (URL-encoded values)**
>
> Name | Description | Required | Type | Example
> ---- | ----------- | -------- | ---- | -------
> username | The user name to authenticate. | true | string | `username=anthony.daga%40habla.ai`
> password | The password to authenticate. | true | string | `HelloWorld`
>
> **Responses**
>
> Code | Description | Headers | Body | Example
> ---- | ----------- | ------- | ---- | -------
> 200 | OK.<br />The token is the JWT used in authenticated API calls requiring security.<br /> otherAttributes is fluid at the moment as we (Mike/Tho/Anthony/Rob) finalize. | N/A | `{ status: 'SUCCESS', "token": "${token"}, ${otherAttributes}, "userType": "${userType}" }` | `{ "status": "SUCCESS", "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFudGhvbnlAaGFibGEuaW8iLCJpYXQiOjE0OTE0MTc5OTJ9.7M0MEkOo0JQM7EBQ2U9cNn11Xe43mbNFnTEVn4gL7K4", "user": { "username": "anthony@habla.io", "email": "anthony@habla.io", "firstName": "Anthony", "lastName": "Daga", "displayName": "Anthony Dude Daga", "country": "Canada", "timeZone": "America/Los_Angeles", "icon": null, "userType": "hablaUser" } }`
> | 401  | UNAUTHORIZED | N/A | N/A | N/A
>
> **Security**
>
> N/A
