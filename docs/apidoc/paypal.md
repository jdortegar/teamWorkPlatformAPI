# PayPal endpoints.

## Create Plan [POST]

### URI Format

`{{host}}/v2/subscriptions/paypal/createplan`

### Request Body Format

```javascript
{
    "email":"jd.or@hotmail.com",
    "billingPlanAttributes":{
      "name":"Habla AI Bronze Month to Month",
      "description":"Monthly Subscription",
      "merchant_preferences":{
         "auto_bill_amount":"yes",
         "cancel_url":"http://localhost:3000/v2/subscriptions/paypal/cancel",
         "initial_fail_amount_action":"continue",
         "max_fail_attempts":"1",
         "return_url":"http://localhost:3000/v2/subscriptions/paypal/processagreement"
      },
      "payment_definitions":[
         {
            "amount":{
               "currency":"USD",
               "value":"15"
            },
            "cycles":"0",
            "frequency":"MONTH",
            "frequency_interval":"1",
            "name":"Monthly",
            "type":"REGULAR"
         }
      ],
      "type":"INFINITE"
    }
}
```

### Response Body Format

```javascript
{
    "id": "P-61R71843D9534404AH2HV6VY",
    "state": "CREATED",
    "name": "Habla AI Bronze Month to Month",
    "description": "Monthly Subscription",
    "type": "INFINITE",
    "payment_definitions": [
        {
            "id": "PD-4VW02248V1015533EH2HV6VY",
            "name": "Monthly",
            "type": "REGULAR",
            "frequency": "Month",
            "amount": {
                "currency": "USD",
                "value": "15"
            },
            "cycles": "0",
            "frequency_interval": "1"
        }
    ],
    "merchant_preferences": {
        "setup_fee": {
            "currency": "USD",
            "value": "0"
        },
        "max_fail_attempts": "1",
        "return_url": "http://localhost:3000/v2/subscriptions/paypal/processagreement",
        "cancel_url": "http://localhost:3000/v2/subscriptions/paypal/cancel",
        "auto_bill_amount": "YES",
        "initial_fail_amount_action": "CONTINUE"
    },
    "create_time": "2019-01-11T20:16:50.007Z",
    "update_time": "2019-01-11T20:16:50.007Z",
    "links": [
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-plans/P-61R71843D9534404AH2HV6VY",
            "rel": "self",
            "method": "GET"
        }
    ],
    "httpStatusCode": 201
}
```

### Request example

```
curl -X POST \
  http://localhost:3000/v2/subscriptions/paypal/createplan \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJjODVlOGZjNy04Y2YyLTRiMGYtOWY3ZS1iNzFjYzIyYmI2ODkiLCJlbWFpbCI6ImRhdmlkLm9ydGVnYUBoYWJsYS5pbyIsIl9zcmMiOnsidXNlcklkIjoiYzg1ZThmYzctOGNmMi00YjBmLTlmN2UtYjcxY2MyMmJiNjg5IiwiYWRkcmVzcyI6IjE5MC4xOTUuNDIuMTgxIiwidXNlckFnZW50IjoiTW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTRfMCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzcwLjAuMzUzOC43NyBTYWZhcmkvNTM3LjM2In0sImlhdCI6MTU0MjA1NjIxNH0.xBw1z6VOtIcNZLo3CkqkDpcITBn2vkT_esSLzOGBzE4' \
  -H 'Content-Type: application/json' \
  -H 'Postman-Token: d53bb0f4-69de-4ea0-90a4-47bc086aa427' \
  -H 'cache-control: no-cache' \
  -d '{
   "billingPlanAttributes":{
      "name":"Habla AI Bronze Month to Month",
      "description":"Monthly Subscription",
      "merchant_preferences":{
         "auto_bill_amount":"yes",
         "cancel_url":"http://localhost:3000/v2/subscriptions/paypal/cancel",
         "initial_fail_amount_action":"continue",
         "max_fail_attempts":"1",
         "return_url":"http://localhost:3000/v2/subscriptions/paypal/processagreement"
      },
      "payment_definitions":[
         {
            "amount":{
               "currency":"USD",
               "value":"15"
            },
            "cycles":"0",
            "frequency":"MONTH",
            "frequency_interval":"1",
            "name":"Monthly",
            "type":"REGULAR"
         }
      ],
      "type":"INFINITE"
   }
}'
```

```javascript
{
    "id": "P-61R71843D9534404AH2HV6VY",
    "state": "CREATED",
    "name": "Habla AI Bronze Month to Month",
    "description": "Monthly Subscription",
    "type": "INFINITE",
    "payment_definitions": [
        {
            "id": "PD-4VW02248V1015533EH2HV6VY",
            "name": "Monthly",
            "type": "REGULAR",
            "frequency": "Month",
            "amount": {
                "currency": "USD",
                "value": "15"
            },
            "cycles": "0",
            "frequency_interval": "1"
        }
    ],
    "merchant_preferences": {
        "setup_fee": {
            "currency": "USD",
            "value": "0"
        },
        "max_fail_attempts": "1",
        "return_url": "http://localhost:3000/v2/subscriptions/paypal/processagreement",
        "cancel_url": "http://localhost:3000/v2/subscriptions/paypal/cancel",
        "auto_bill_amount": "YES",
        "initial_fail_amount_action": "CONTINUE"
    },
    "create_time": "2019-01-11T20:16:50.007Z",
    "update_time": "2019-01-11T20:16:50.007Z",
    "links": [
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-plans/P-61R71843D9534404AH2HV6VY",
            "rel": "self",
            "method": "GET"
        }
    ],
    "httpStatusCode": 201
}
```

## Create Agreement [get]

### URI Format

`{{host}}/v2/subscriptions/paypal/createagreement?plan=planId`

### Plan Id obtained in Create Plan

### Response Body Format

```javascript
"https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=EC-90C05108N38284057"
```

### Request example

```
curl -X GET \
  'http://localhost:3000/v2/subscriptions/paypal/createagreement?plan=P-7SV08640106715004H2MMAEQ' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJjODVlOGZjNy04Y2YyLTRiMGYtOWY3ZS1iNzFjYzIyYmI2ODkiLCJlbWFpbCI6ImRhdmlkLm9ydGVnYUBoYWJsYS5pbyIsIl9zcmMiOnsidXNlcklkIjoiYzg1ZThmYzctOGNmMi00YjBmLTlmN2UtYjcxY2MyMmJiNjg5IiwiYWRkcmVzcyI6IjE5MC4xOTUuNDIuMTgxIiwidXNlckFnZW50IjoiTW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTRfMCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzcwLjAuMzUzOC43NyBTYWZhcmkvNTM3LjM2In0sImlhdCI6MTU0MjA1NjIxNH0.xBw1z6VOtIcNZLo3CkqkDpcITBn2vkT_esSLzOGBzE4' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Postman-Token: 4c0bbf26-1e17-4724-a010-916941fbe79c' \
  -H 'cache-control: no-cache' \
  -d undefined=
```

```javascript
"https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=EC-90C05108N38284057"
```

## Process Agreement [get]

### URI Format

`{{host}}/v2/subscriptions/paypal/processagreement?token=tokenId`

### Response Body Format

```javascript
{
    "id": "I-99CYSWU2DET9",
    "state": "Active",
    "description": "Monthly Subscription",
    "start_date": "2019-01-12T08:00:00Z",
    "payer": {
        "payment_method": "paypal",
        "status": "verified",
        "payer_info": {
            "email": "jd.or-buyer@hotmail.com",
            "first_name": "test",
            "last_name": "buyer",
            "payer_id": "VZQJ4X8RP65GY",
            "shipping_address": {
                "recipient_name": "test buyer",
                "line1": "1 Main St",
                "city": "San Jose",
                "state": "CA",
                "postal_code": "95131",
                "country_code": "US"
            }
        }
    },
    "shipping_address": {
        "recipient_name": "test buyer",
        "line1": "1 Main St",
        "city": "San Jose",
        "state": "CA",
        "postal_code": "95131",
        "country_code": "US"
    },
    "plan": {
        "payment_definitions": [
            {
                "type": "REGULAR",
                "frequency": "Month",
                "amount": {
                    "value": "15.00"
                },
                "cycles": "0",
                "charge_models": [
                    {
                        "type": "TAX",
                        "amount": {
                            "value": "0.00"
                        }
                    },
                    {
                        "type": "SHIPPING",
                        "amount": {
                            "value": "0.00"
                        }
                    }
                ],
                "frequency_interval": "1"
            }
        ],
        "merchant_preferences": {
            "setup_fee": {
                "value": "0.00"
            },
            "max_fail_attempts": "1",
            "auto_bill_amount": "YES"
        },
        "currency_code": "USD"
    },
    "links": [
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-agreements/I-99CYSWU2DET9",
            "rel": "self",
            "method": "GET"
        }
    ],
    "agreement_details": {
        "outstanding_balance": {
            "value": "0.00"
        },
        "cycles_remaining": "0",
        "cycles_completed": "0",
        "next_billing_date": "2019-01-12T10:00:00Z",
        "final_payment_date": "1970-01-01T00:00:00Z",
        "failed_payment_count": "0"
    },
    "httpStatusCode": 200
}
```

### Request example

```
curl -X GET \
  'http://localhost:3000/v2/subscriptions/paypal/processagreement?token=EC-5G6072688P201535A' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJjODVlOGZjNy04Y2YyLTRiMGYtOWY3ZS1iNzFjYzIyYmI2ODkiLCJlbWFpbCI6ImRhdmlkLm9ydGVnYUBoYWJsYS5pbyIsIl9zcmMiOnsidXNlcklkIjoiYzg1ZThmYzctOGNmMi00YjBmLTlmN2UtYjcxY2MyMmJiNjg5IiwiYWRkcmVzcyI6IjE5MC4xOTUuNDIuMTgxIiwidXNlckFnZW50IjoiTW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTRfMCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzcwLjAuMzUzOC43NyBTYWZhcmkvNTM3LjM2In0sImlhdCI6MTU0MjA1NjIxNH0.xBw1z6VOtIcNZLo3CkqkDpcITBn2vkT_esSLzOGBzE4' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Postman-Token: e9170b6b-044f-4f77-8fde-abb4bc74e09c' \
  -H 'cache-control: no-cache' \
  -d undefined=
```

```javascript
{
    "id": "I-99CYSWU2DET9",
    "state": "Active",
    "description": "Monthly Subscription",
    "start_date": "2019-01-12T08:00:00Z",
    "payer": {
        "payment_method": "paypal",
        "status": "verified",
        "payer_info": {
            "email": "jd.or-buyer@hotmail.com",
            "first_name": "test",
            "last_name": "buyer",
            "payer_id": "VZQJ4X8RP65GY",
            "shipping_address": {
                "recipient_name": "test buyer",
                "line1": "1 Main St",
                "city": "San Jose",
                "state": "CA",
                "postal_code": "95131",
                "country_code": "US"
            }
        }
    },
    "shipping_address": {
        "recipient_name": "test buyer",
        "line1": "1 Main St",
        "city": "San Jose",
        "state": "CA",
        "postal_code": "95131",
        "country_code": "US"
    },
    "plan": {
        "payment_definitions": [
            {
                "type": "REGULAR",
                "frequency": "Month",
                "amount": {
                    "value": "15.00"
                },
                "cycles": "0",
                "charge_models": [
                    {
                        "type": "TAX",
                        "amount": {
                            "value": "0.00"
                        }
                    },
                    {
                        "type": "SHIPPING",
                        "amount": {
                            "value": "0.00"
                        }
                    }
                ],
                "frequency_interval": "1"
            }
        ],
        "merchant_preferences": {
            "setup_fee": {
                "value": "0.00"
            },
            "max_fail_attempts": "1",
            "auto_bill_amount": "YES"
        },
        "currency_code": "USD"
    },
    "links": [
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-agreements/I-99CYSWU2DET9",
            "rel": "self",
            "method": "GET"
        }
    ],
    "agreement_details": {
        "outstanding_balance": {
            "value": "0.00"
        },
        "cycles_remaining": "0",
        "cycles_completed": "0",
        "next_billing_date": "2019-01-12T10:00:00Z",
        "final_payment_date": "1970-01-01T00:00:00Z",
        "failed_payment_count": "0"
    },
    "httpStatusCode": 200
}
```

## Cancel Agreement [get]

### URI Format

`{{host}}/v2/subscriptions/paypal/cancelagreement?agreement=agreementId`

### Response Body Format

```javascript
{
    "id": "I-5F85M52L9J7G",
    "state": "Cancelled",
    "description": "Monthly Subscription",
    "start_date": "2019-01-11T08:00:00Z",
    "payer": {
        "payment_method": "paypal",
        "status": "verified",
        "payer_info": {
            "email": "jd.or-buyer@hotmail.com",
            "first_name": "test",
            "last_name": "buyer",
            "payer_id": "VZQJ4X8RP65GY",
            "shipping_address": {
                "recipient_name": "test buyer",
                "line1": "1 Main St",
                "city": "San Jose",
                "state": "CA",
                "postal_code": "95131",
                "country_code": "US"
            }
        }
    },
    "shipping_address": {
        "recipient_name": "test buyer",
        "line1": "1 Main St",
        "city": "San Jose",
        "state": "CA",
        "postal_code": "95131",
        "country_code": "US"
    },
    "plan": {
        "payment_definitions": [
            {
                "type": "REGULAR",
                "frequency": "Month",
                "amount": {
                    "currency": "USD",
                    "value": "15.00"
                },
                "cycles": "0",
                "charge_models": [
                    {
                        "type": "TAX",
                        "amount": {
                            "currency": "USD",
                            "value": "0.00"
                        }
                    },
                    {
                        "type": "SHIPPING",
                        "amount": {
                            "currency": "USD",
                            "value": "0.00"
                        }
                    }
                ],
                "frequency_interval": "1"
            }
        ],
        "merchant_preferences": {
            "setup_fee": {
                "currency": "USD",
                "value": "0.00"
            },
            "max_fail_attempts": "1",
            "auto_bill_amount": "YES"
        }
    },
    "links": [
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-agreements/I-5F85M52L9J7G/suspend",
            "rel": "suspend",
            "method": "POST"
        },
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-agreements/I-5F85M52L9J7G/re-activate",
            "rel": "re_activate",
            "method": "POST"
        },
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-agreements/I-5F85M52L9J7G/cancel",
            "rel": "cancel",
            "method": "POST"
        },
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-agreements/I-5F85M52L9J7G/bill-balance",
            "rel": "self",
            "method": "POST"
        },
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-agreements/I-5F85M52L9J7G/set-balance",
            "rel": "self",
            "method": "POST"
        }
    ],
    "agreement_details": {
        "outstanding_balance": {
            "currency": "USD",
            "value": "0.00"
        },
        "cycles_remaining": "18446744073709551615",
        "cycles_completed": "1",
        "last_payment_date": "2019-01-11T21:16:46Z",
        "last_payment_amount": {
            "currency": "USD",
            "value": "15.00"
        },
        "final_payment_date": "1970-01-01T00:00:00Z",
        "failed_payment_count": "0"
    },
    "httpStatusCode": 200
}
```

### Request example

```
curl -X GET \
  'http://localhost:3000/v2/subscriptions/paypal/cancelagreement?agreement=I-5F85M52L9J7G' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJjODVlOGZjNy04Y2YyLTRiMGYtOWY3ZS1iNzFjYzIyYmI2ODkiLCJlbWFpbCI6ImRhdmlkLm9ydGVnYUBoYWJsYS5pbyIsIl9zcmMiOnsidXNlcklkIjoiYzg1ZThmYzctOGNmMi00YjBmLTlmN2UtYjcxY2MyMmJiNjg5IiwiYWRkcmVzcyI6IjE5MC4xOTUuNDIuMTgxIiwidXNlckFnZW50IjoiTW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTRfMCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzcwLjAuMzUzOC43NyBTYWZhcmkvNTM3LjM2In0sImlhdCI6MTU0MjA1NjIxNH0.xBw1z6VOtIcNZLo3CkqkDpcITBn2vkT_esSLzOGBzE4' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Postman-Token: 5a5059f0-faef-4796-b014-58782dea0821' \
  -H 'cache-control: no-cache' \
  -d undefined=
```

```javascript
{
    "id": "I-5F85M52L9J7G",
    "state": "Cancelled",
    "description": "Monthly Subscription",
    "start_date": "2019-01-11T08:00:00Z",
    "payer": {
        "payment_method": "paypal",
        "status": "verified",
        "payer_info": {
            "email": "jd.or-buyer@hotmail.com",
            "first_name": "test",
            "last_name": "buyer",
            "payer_id": "VZQJ4X8RP65GY",
            "shipping_address": {
                "recipient_name": "test buyer",
                "line1": "1 Main St",
                "city": "San Jose",
                "state": "CA",
                "postal_code": "95131",
                "country_code": "US"
            }
        }
    },
    "shipping_address": {
        "recipient_name": "test buyer",
        "line1": "1 Main St",
        "city": "San Jose",
        "state": "CA",
        "postal_code": "95131",
        "country_code": "US"
    },
    "plan": {
        "payment_definitions": [
            {
                "type": "REGULAR",
                "frequency": "Month",
                "amount": {
                    "currency": "USD",
                    "value": "15.00"
                },
                "cycles": "0",
                "charge_models": [
                    {
                        "type": "TAX",
                        "amount": {
                            "currency": "USD",
                            "value": "0.00"
                        }
                    },
                    {
                        "type": "SHIPPING",
                        "amount": {
                            "currency": "USD",
                            "value": "0.00"
                        }
                    }
                ],
                "frequency_interval": "1"
            }
        ],
        "merchant_preferences": {
            "setup_fee": {
                "currency": "USD",
                "value": "0.00"
            },
            "max_fail_attempts": "1",
            "auto_bill_amount": "YES"
        }
    },
    "links": [
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-agreements/I-5F85M52L9J7G/suspend",
            "rel": "suspend",
            "method": "POST"
        },
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-agreements/I-5F85M52L9J7G/re-activate",
            "rel": "re_activate",
            "method": "POST"
        },
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-agreements/I-5F85M52L9J7G/cancel",
            "rel": "cancel",
            "method": "POST"
        },
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-agreements/I-5F85M52L9J7G/bill-balance",
            "rel": "self",
            "method": "POST"
        },
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-agreements/I-5F85M52L9J7G/set-balance",
            "rel": "self",
            "method": "POST"
        }
    ],
    "agreement_details": {
        "outstanding_balance": {
            "currency": "USD",
            "value": "0.00"
        },
        "cycles_remaining": "18446744073709551615",
        "cycles_completed": "1",
        "last_payment_date": "2019-01-11T21:16:46Z",
        "last_payment_amount": {
            "currency": "USD",
            "value": "15.00"
        },
        "final_payment_date": "1970-01-01T00:00:00Z",
        "failed_payment_count": "0"
    },
    "httpStatusCode": 200
}
```
## Update Agreement [POST]

### URI Format

`{{host}}/v2/subscriptions/paypal/updateagreement?agreement=agreementId`

### Request Body Format

```javascript
{
    "email":"jd.or@hotmail.com",
    "billingPlanAttributes":{
      "name":"Habla AI Bronze Month to Month",
      "description":"Monthly Subscription",
      "merchant_preferences":{
         "auto_bill_amount":"yes",
         "cancel_url":"http://localhost:3000/v2/subscriptions/paypal/cancel",
         "initial_fail_amount_action":"continue",
         "max_fail_attempts":"1",
         "return_url":"http://localhost:3000/v2/subscriptions/paypal/processagreement"
      },
      "payment_definitions":[
         {
            "amount":{
               "currency":"USD",
               "value":"15"
            },
            "cycles":"0",
            "frequency":"MONTH",
            "frequency_interval":"1",
            "name":"Monthly",
            "type":"REGULAR"
         }
      ],
      "type":"INFINITE"
    }
}
```

### Response Body Format

```javascript
{
    "id": "P-61R71843D9534404AH2HV6VY",
    "state": "CREATED",
    "name": "Habla AI Bronze Month to Month",
    "description": "Monthly Subscription",
    "type": "INFINITE",
    "payment_definitions": [
        {
            "id": "PD-4VW02248V1015533EH2HV6VY",
            "name": "Monthly",
            "type": "REGULAR",
            "frequency": "Month",
            "amount": {
                "currency": "USD",
                "value": "15"
            },
            "cycles": "0",
            "frequency_interval": "1"
        }
    ],
    "merchant_preferences": {
        "setup_fee": {
            "currency": "USD",
            "value": "0"
        },
        "max_fail_attempts": "1",
        "return_url": "http://localhost:3000/v2/subscriptions/paypal/processagreement",
        "cancel_url": "http://localhost:3000/v2/subscriptions/paypal/cancel",
        "auto_bill_amount": "YES",
        "initial_fail_amount_action": "CONTINUE"
    },
    "create_time": "2019-01-11T20:16:50.007Z",
    "update_time": "2019-01-11T20:16:50.007Z",
    "links": [
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-plans/P-61R71843D9534404AH2HV6VY",
            "rel": "self",
            "method": "GET"
        }
    ],
    "httpStatusCode": 201
}
```

### Request example

```
curl -X POST \
  http://localhost:3000/v2/subscriptions/paypal/createplan \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJjODVlOGZjNy04Y2YyLTRiMGYtOWY3ZS1iNzFjYzIyYmI2ODkiLCJlbWFpbCI6ImRhdmlkLm9ydGVnYUBoYWJsYS5pbyIsIl9zcmMiOnsidXNlcklkIjoiYzg1ZThmYzctOGNmMi00YjBmLTlmN2UtYjcxY2MyMmJiNjg5IiwiYWRkcmVzcyI6IjE5MC4xOTUuNDIuMTgxIiwidXNlckFnZW50IjoiTW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTRfMCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzcwLjAuMzUzOC43NyBTYWZhcmkvNTM3LjM2In0sImlhdCI6MTU0MjA1NjIxNH0.xBw1z6VOtIcNZLo3CkqkDpcITBn2vkT_esSLzOGBzE4' \
  -H 'Content-Type: application/json' \
  -H 'Postman-Token: d53bb0f4-69de-4ea0-90a4-47bc086aa427' \
  -H 'cache-control: no-cache' \
  -d '{
   "billingPlanAttributes":{
      "name":"Habla AI Bronze Month to Month",
      "description":"Monthly Subscription",
      "merchant_preferences":{
         "auto_bill_amount":"yes",
         "cancel_url":"http://localhost:3000/v2/subscriptions/paypal/cancel",
         "initial_fail_amount_action":"continue",
         "max_fail_attempts":"1",
         "return_url":"http://localhost:3000/v2/subscriptions/paypal/processagreement"
      },
      "payment_definitions":[
         {
            "amount":{
               "currency":"USD",
               "value":"15"
            },
            "cycles":"0",
            "frequency":"MONTH",
            "frequency_interval":"1",
            "name":"Monthly",
            "type":"REGULAR"
         }
      ],
      "type":"INFINITE"
   }
}'
```

```javascript
{
    "id": "P-61R71843D9534404AH2HV6VY",
    "state": "CREATED",
    "name": "Habla AI Bronze Month to Month",
    "description": "Monthly Subscription",
    "type": "INFINITE",
    "payment_definitions": [
        {
            "id": "PD-4VW02248V1015533EH2HV6VY",
            "name": "Monthly",
            "type": "REGULAR",
            "frequency": "Month",
            "amount": {
                "currency": "USD",
                "value": "15"
            },
            "cycles": "0",
            "frequency_interval": "1"
        }
    ],
    "merchant_preferences": {
        "setup_fee": {
            "currency": "USD",
            "value": "0"
        },
        "max_fail_attempts": "1",
        "return_url": "http://localhost:3000/v2/subscriptions/paypal/processagreement",
        "cancel_url": "http://localhost:3000/v2/subscriptions/paypal/cancel",
        "auto_bill_amount": "YES",
        "initial_fail_amount_action": "CONTINUE"
    },
    "create_time": "2019-01-11T20:16:50.007Z",
    "update_time": "2019-01-11T20:16:50.007Z",
    "links": [
        {
            "href": "https://api.sandbox.paypal.com/v1/payments/billing-plans/P-61R71843D9534404AH2HV6VY",
            "rel": "self",
            "method": "GET"
        }
    ],
    "httpStatusCode": 201
}
```
