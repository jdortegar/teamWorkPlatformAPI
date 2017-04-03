# Users API

TODO: description here.

**Version** 0.1.5

## Paths

#### /users/registerUser
> ```
> POST /users/registerUser
> ```
> **Summary**
>
> Create a reservation for a user based on an email address.
>
> **Description**
>
> If a user submits a registration for a valid email address (formatted correctly), the service responds with a 200-OK status and a payload.  The payload includes a uuid field, which contains the reservation-id for the user.  The reservation-id is used by the validateEmail endpoint to mitigate hacking risks, and locates the associated email address in the Redis cache.  This registration is stored in cache for a defined time-to-live (TTL).  If the user does not respond to the email and complete registration prior to expiration of the registration, they must register again.<br/>
> A reservation is a uniquely generated key used in the process of securely registering a new user.
> It is used in initial communication through email, web, and mobile clients.
> There can be multiple reservations for a user/email concurrently existing, as actual registered user uniqueness is enforced later in the process when the user is actually created in the system.
> The default expiration of a reservation is 30 minutes, after which it is cleared from cache and no longer valid.
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
> email | The email address to register.<br/>Should be validated client-side prior to invocation to ensure that a properly formatted email address has been provided by the calling application. | true | string | `email=anthony.daga%40habla.ai`
>
> **Responses**
>
> Code | Description | Headers | Body | Example
> ---- | ----------- | ------- | ---- | -------
> 200 | OK</br>The uuid is the Reservation ID (rid) | N/A | `{ status: 'SUCCESS', uuid }` | `{ status: 'SUCCESS', uuid: '9dec8947-0381-4809-a053-b56777f782f4' }`
> | 400  | BAD_REQUEST<br/>Invalid email address. | N/A | N/A | N/A
> | 503  | SERVICE_UNAVAILABLE<br/>A server error has occurred, typically Redis availability in this case. | N/A | N/A | N/A
>
> **Security**
>
> N/A

#### /users/validateEmail
> ```
> GET /users/validateEmail/{rid}
> ```
> **Summary**
>
> Retrieve the email address associated with a Reservation ID (rid).
> 
> **Description**
>
> The reservation should have been previously created from the `POST /users/registerUser` endpoint, and is valid until expired.
> Use this method to obtain the email address associated with a rid, typically for display purposes.
>
> **Request Headers**
>
> Name | Value | Example
> ---- | ----- | -------
> Content-Type | application/json | N/A 
>
> **URL Path Values**
>
> | Name | Description | Required | Type   | Example |
> |------|-------------|----------|--------|---------|
> | rid   | The Reservation ID. | true | string | 9dec8947-0381-4809-a053-b56777f782f4 |
>
> **URL Parameters**
>
> N/A
>
> **Body**
>
> N/A
>
> **Responses**
>
> | Code | Description | Headers | Body | Example |
> |------|-------------|---------|------|---------|
> | 200  | OK<br/>Content-Type = 'application/json' | N/A | `{ status: 'SUCCESS', email }` | `{ status: 'SUCCESS', email: 'anthony.daga@habla.ai' }` |
> | 404  | NOT_FOUND | N/A | N/A | N/A |
>
> **Security**
>
> N/A


#### /users
TODO: inconsistent.  Should be /users/createUser?
> ```
> POST /users
> ```
> **Summary**
>
> Create a user in Habla.
> 
> **Description**
>
> A user is created (i.e. persisted) in Habla.
>
> **Request Headers**
>
> Name | Value | Example
> ---- | ----- | -------
> Content-Type | application/json | N/A 
>
> **URL Path Values**
>
> N/A
>
> **URL Parameters**
>
> N/A
>
> **Body (JSON)**
>
> Name | Description | Required | Type   | Example
> ---- | ----------- | -------- | ------ | -------
> firstName | First Name | true | string | firstName: 'Anthony'
> lastName | Last Name | true | string | lastName: 'Daga'
> displayName | Display Name | true | string | displayName: 'Anthony Dude Daga'
> email | Email Address | true | string | email: 'anthony.daga@habla.ai'
> password | Cleartext password | true | string | password: 'hello-World123'
> country | Country | true | string | country: 'Canada'
> timeZone | Time Zone | true | string | timeZone: 'America/Los_Angeles'
> *Example*
```
{
   firstName: 'Anthony',
   lastName: 'Daga',
   displayName: 'Anthony Dude Daga',
   email: 'anthony.daga@habla.ai',
   password: 'hello-World123',
   country: 'Canada',
   timeZone: 'America/Los_Angeles'
}
```
>
> **Responses**
>
> Code | Description | Headers | Body | Example
> ---- | ----------- | ------- | ---- | -------
> 200 | OK | N/A | N/A | N/A
> 403 | FORBIDDEN<br/>The user (specifically email) is already registered. | N/A | N/A | N/A
>
> **Security**
>
> N/A


