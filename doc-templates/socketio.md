## Socket.io

* [Overview](#Overview)
* [Client](#Client)
* [Spec](#Spec)
* [Browser Networking](#BrowserNetworking)
* [Load Balancing](#LoadBalancing)
* [Tests](#Tests)
* [Answer](#Answer)


<a name="Overview" />

### Overview

WebSockets represent a standard for bi-directional communication between a client and a server which involves creating a TCP connection that links them together.
The TCP connection sits outside of HTTP, and thus runs a separate server to manage this communication.
To initialize this connection, a handshake is performed between the client and the server; here’s the general process:

1) The client makes an HTTP request to the server with an upgrade header, indicating that the client wishes to establish a WebSocket connection. Notice the ws URI scheme (short for WebSocket). wss is also available for secure WebSocket communication.

    GET ws://websocket.example.com/ HTTP/1.1<br />
    Origin: http://example.com<br />
    Connection: Upgrade<br />
    Host: websocket.example.com<br />
    Upgrade: websocket
    
2) If the server supports the WebSocket protocol, then it will agree to the upgrade and send a response back.

    HTTP/1.1 101 WebSocket Protocol Handshake<br />
    Date: Wed, 16 Jan 2016 10:07:34 GMT<br />
    Connection: Upgrade<br />
    Upgrade: WebSocket
    
3) The handshake is complete, and all further communication will follow the WebSocket protocol and will use the same underlying TCP port. The returning status code is 101, which stands for Switching Protocols.


<a name="Client" />

### Client

[Socket.io Client API](https://socket.io/docs/client-api/)

By default, a long-polling connection is established first, then upgraded to "better" transports (like WebSocket).


<a name="Spec" />

### Spec

[WebSocket Protocol Spec](https://tools.ietf.org/html/rfc6455)

[Excerpt]

The WebSocket Protocol enables two-way communication between a client running untrusted code in a controlled environment to a remote host that has opted-in to communications from that code.
The security model used for this is the origin-based security model commonly used
by web browsers.
The protocol consists of **an opening handshake followed by basic message framing, layered over TCP**.
The goal of this technology is to provide a mechanism for browser-based applications that need two-way communication with servers that does not rely on opening multiple HTTP connections (e.g., using XMLHttpRequest or &lt;iframe&gt;s and long polling).

The opening handshake is intended to be compatible with HTTP-based server-side software and intermediaries, so that a single port can be used by both HTTP clients talking to that server and WebSocket clients talking to that server.
To this end, the WebSocket client's handshake is an HTTP Upgrade request:

    GET /chat HTTP/1.1
    Host: server.example.com
    Upgrade: websocket
    Connection: Upgrade
    Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
    Origin: http://example.com
    Sec-WebSocket-Protocol: chat, superchat
    Sec-WebSocket-Version: 13
    
Conceptually, WebSocket is really just a layer on top of TCP that does the following:

* adds a web origin-based security model for browsers

* adds an addressing and protocol naming mechanism to support multiple services on one port and multiple host names on one IP address

* layers a framing mechanism on top of TCP to get back to the IP packet mechanism that TCP is built on, but without length limits

* includes an additional closing handshake in-band that is designed to work in the presence of proxies and other intermediaries

Other than that, WebSocket adds nothing.


<a name="BrowserNetworking" />

### Browser Networking

[WebSocket](https://hpbn.co/websocket/)

Nice read.
Starts with networking in general to wireless networks, but geared to browser networking.
Lots of good stuff. (refer to TOC)

HTTP Upgrade Negotiation
The WebSocket protocol delivers a lot of powerful features: message-oriented communication, its own binary framing layer, subprotocol negotiation, optional protocol extensions, and more.
As a result, before any messages can be exchanged, the client and server must negotiate the appropriate parameters to establish the connection.

Leveraging HTTP to perform the handshake offers several advantages.
First, it makes WebSockets compatible with existing HTTP infrastructure: WebSocket servers can run on port 80 and 443, which are frequently the only open ports for the client.
Second, it allows us to reuse and extend the HTTP Upgrade flow with custom WebSocket headers to perform the negotiation.

To simplify cross-browser deployment, popular libraries such as SockJS provide an implementation of WebSocket-like object in the browser but also go one step further by providing a custom server that implements support for WebSocket and a variety of alternative transports.
The combination of a custom server and client is what enables "seamless fallback": the performance suffers, but the application API remains the same.

Other libraries, such as Socket.IO, go even further by implementing additional features, such as heartbeats, timeouts, support for automatic reconnects, and more, in addition to a multitransport fallback functionality.

When considering a polyfill library or a "real-time framework," such as Socket.IO, pay close attention to the underlying implementation and configuration of the client and server: always leverage the native WebSocket interface for best performance, and ensure that fallback transports meet your performance goals.


<a name="LoadBalancing" />

### Load Balancing

[Load-balancing Websockets on EC2](https://medium.com/@Philmod/load-balancing-websockets-on-ec2-1da94584a5e9)

A little dated.


<a name="Tests" />

### Tests

Finally, some tests.
Results captured from Chrome DevTools, Networking tab, after login.

Following are the request/response for hitting servers on localhost, ngrok tunnel, and aws.
localhost and ngrok tunnel successfully negotiated the upgrade to websocket.
aws did not.


#### localhost -> 101

    GENERAL
    Request URL:ws://localhost:3000/socket.io/?EIO=3&transport=websocket&sid=8BLX03lSudRxSUCTAAAB
    Request Method:GET
    Status Code:101 Switching Protocols
    RESPONSE HEADERS
    Connection:Upgrade
    Sec-WebSocket-Accept:iVxnsSnjmFxVhfPRXgqbk7DNPr8=
    Sec-WebSocket-Extensions:permessage-deflate; client_no_context_takeover
    Sec-WebSocket-Version:13
    Upgrade:websocket
    WebSocket-Server:uWebSockets
    REQUEST HEADERS
    Accept-Encoding:gzip, deflate, br
    Accept-Language:en-US,en;q=0.8,ja;q=0.6
    Cache-Control:no-cache
    Connection:Upgrade
    Cookie:lastRoute__e9e5684b-77d0-4140-a04b-8382186e5fac=/; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiIzYTgyYmU0My00NTYzLTRiMmItODczOC1iMWVmYzdkY2QyMmEiLCJlbWFpbCI6ImFudGhvbnlAaGFibGEuaW8iLCJpYXQiOjE1MDEzNjA4ODZ9.mvxQ2Rxf_H9hYYAfSVBno6jbJdtQEISOUx57yVvhE6U; websocketUrl=http://localhost:3000; io=8BLX03lSudRxSUCTAAAB
    Host:localhost:3000
    Origin:http://localhost:8081
    Pragma:no-cache
    Sec-WebSocket-Extensions:permessage-deflate; client_max_window_bits
    Sec-WebSocket-Key:F9/CBMHXMz4PgwNtjKZNtQ==
    Sec-WebSocket-Version:13
    Upgrade:websocket
    User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36
    QUERY STRING PARAMETERS
    EIO:3
    transport:websocket
    sid:8BLX03lSudRxSUCTAAAB

#### ngrok -> 101

    GENERAL
    Request URL:wss://hablaapi.ngrok.io/socket.io/?EIO=3&transport=websocket&sid=nzIYyp8W6D52kIUEAAAA
    Request Method:GET
    Status Code:101 Switching Protocols
    RESPONSE HEADERS
    Connection:Upgrade
    Sec-WebSocket-Accept:4WNLsxB+HiYUh+vAcmlVGaXMQpM=
    Sec-WebSocket-Extensions:permessage-deflate; client_no_context_takeover
    Sec-WebSocket-Version:13
    Upgrade:websocket
    WebSocket-Server:uWebSockets
    REQUEST HEADERS
    Accept-Encoding:gzip, deflate, br
    Accept-Language:en-US,en;q=0.8,ja;q=0.6
    Cache-Control:no-cache
    Connection:Upgrade
    Cookie:io=nzIYyp8W6D52kIUEAAAA
    Host:hablaapi.ngrok.io
    Origin:https://hablawebapp.ngrok.io
    Pragma:no-cache
    Sec-WebSocket-Extensions:permessage-deflate; client_max_window_bits
    Sec-WebSocket-Key:PrKVrjH8V9OkxDVl8TyOpg==
    Sec-WebSocket-Version:13
    Upgrade:websocket
    User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36
    QUERY STRING PARAMETERS
    view URL encoded
    EIO:3
    transport:websocket
    sid:nzIYyp8W6D52kIUEAAAA

#### AWS dev -> 400

    GENERAL
    Request URL:wss://habla-fe-api-dev.habla.ai/socket.io/?EIO=3&transport=websocket&sid=b4vyARaebRKRo5jpAA4g
    Request Method:GET
    Status Code:400 Bad Request
    RESPONSE HEADERS
    Access-Control-Allow-Credentials:true
    Access-Control-Allow-Origin:https://dev.habla.ai
    Connection:keep-alive
    Content-Length:34
    Content-Type:application/json
    Date:Sat, 29 Jul 2017 20:42:40 GMT
    Server:nginx/1.10.2
    REQUEST HEADERS
    Accept-Encoding:gzip, deflate, br
    Accept-Language:en-US,en;q=0.8,ja;q=0.6
    Cache-Control:no-cache
    Connection:Upgrade
    Cookie:io=b4vyARaebRKRo5jpAA4g
    Host:habla-fe-api-dev.habla.ai
    Origin:https://dev.habla.ai
    Pragma:no-cache
    Sec-WebSocket-Extensions:permessage-deflate; client_max_window_bits
    Sec-WebSocket-Key:BSvyDs7b930MZiaT4XcFSQ==
    Sec-WebSocket-Version:13
    Upgrade:websocket
    User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36
    QUERY STRING PARAMETERS
    view URL encoded
    EIO:3
    transport:websocket
    sid:b4vyARaebRKRo5jpAA4g


<a name="Answer" />

### Answer?

I think this is the answer:

https://stackoverflow.com/questions/25730368/websockets-wss-from-client-to-amazon-aws-ec2-instance-through-elb#27458224

Possible correction:

After speaking to an AWS devops expert, whose dealt with similar problems, it's most likely EB and it's preset configurations (ex. with nginx).
He had to do custom (eventually automated) configuration.

A couple notes.
There is nginx config to allow websockets protocol passthrough.
Better solution: We shouldn't even be using nginx.  Load balancing and ssl termination should be at the ELB.

