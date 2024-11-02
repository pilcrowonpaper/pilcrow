---
title: "Maybe you don't need refresh tokens"
date: "2024-11-2"
---

JSON web tokens (JWTs) have become _the_ standard for implementing stateless tokens. They're commonly used as sessions and as API tokens, usually with OAuth 2.0.

The main drawback with stateless tokens is that they're stateless. Once you issue one, you can't revoke it. The standard practice is to set a short expiration and provide the client with a stateful refresh token. The client can send their refresh token to the server to get a new access token.

But refresh tokens suck. As the client, I don't want to deal with more than one token and why should it be my responsibility anyway?

So let's get rid of them.

The idea is simple. We'll just embed the refresh token inside the access token.

```json
{
	"refresh_token": "1u0wbpwkfhyr104urbyh21l",
	"exp": 1730464322
}
```

When the client send an expired access token, the server extracts and validates the refresh token. If it's valid, it will accept the request as if the access token was valid and create a new access token with the same refresh token. There's no reason to make the refresh token single use.

At this point, the refresh token isn't really a _refresh_ token anymore. From the server's perspective, it's the main authentication token. The JWT is just a pseudo-caching mechanism using cryptographic signatures.

```json
{
	"token": "1u0wbpwkfhyr104urbyh21l", // stateful token
	"exp": 1730464322
}
```

This simplifies both the client and server implementation and works with the OAuth 2.0 specification. I'd still argue that JWT-based sessions are an overkill for the majority of apps but this is a much better approach if you need stateless-ness.

Security wise, the main benefit of using a separate refresh token is that you can potentially limit the risks if the access token gets leaked. But you only get this if the tokens are stored in different locations or if you plan to share the access token across multiple servers. Essentially, in most cases you're not getting any security benefits.
