# Protocol

This document describes how RSS-o-Bot remotes communicate with RSS-o-Bot servers.

## Terminology

### Remote
RSS-o-Bot running in remote-mode. All (actually only most) commands are sent to a RSS-o-Bot server and are executed on that machine.

### Server
RSS-o-Bot running in server-mode. Commands can be sent to it as specified here and they will be executed by the server.

## Description

Commands sent by the client are signed in order for the server to be able to verify their origin. Communication is not encrypted. It is recommendet to use a TLS to encrypt the connection. This can be done using a reverse-proxy.

Messages are passed from remote to server as [JWT](https://tools.ietf.org/html/rfc7519)s. These are signed using RSASSA. The public key needed by the server to verify the JWS (JSON Web Signature) is transmitted by the client on first use.

### Key Generation And Transmition

4096 bit RSA keys are genereted if there are none inside the configuration directory. Keys are generated using OpenSSL. So the key generation mechanism won't work on every OS. In those cases, they must be generated manualy. After the keys are generated, the public key is sent to the server. If RSA-keys were generated manually, the transmission of the public key will have to be triggered manually.

