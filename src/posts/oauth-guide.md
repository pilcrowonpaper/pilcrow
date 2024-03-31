---
title: "A beginner's guide to OAuth 2.0"
description: "OAuth isn't hard."
date: "2023-11-13"
---

If you've ever signed in to a website using your GitHub account, that website was likely using OAuth. OAuth allows third parties to access your data on GitHub and other services, without requiring you to share your password. It's a widely accepted standard that, for once, not really complicated or hard to implement, and using it can greatly simplify your app's auth.

This guide is my attempt to summarize the [RFC](https://datatracker.ietf.org/doc/html/rfc6749) by covering the concepts behind the protocol as well as demonstrating how it can be implemented with code examples. I'll also share some libraries I made to simplify development at the end.

> The code examples use TypeScript but I'm hoping this guide is helpful regardless of your preferred language. Maybe I should've used Go...

## Overview

There are multiple variations of OAuth 2.0 (plus OAuth 1.0), but the most common one is the authorization code grant type. That'll be our focus. This type of OAuth flow requires a server and has 5 steps:

1. Redirect the user to the provider (e.g. GitHub)
2. User is authenticated by the provider
3. User is redirected back to your server with a secret code
4. Exchange that secret code for the user's access token
5. Use the access token access the user's data

I'll be referring to these steps throughout the guide.

> Note: I won't be covering the newer PKCE flow

### How it plays into your auth

While it's an _authorization_ and not an _authentication_ framework, it usually requires an authentication step at the provider's end and the user's profile can be retrieved using the issued access token. This means you can verify the user's identity while off loading many steps required when implementing email and password auth, including email verification, password reset, two factor authorization..

However, **it does not mean OAuth handles everything required in implementing auth**. You still need to keep your own user table and manage sessions. The access token should never be used as replacement for sessions.

## Setup

You first need to register your app with your provider to get the required credentials. You'll be asked to define a callback URL or a redirect URI. This is the URL the user will redirected back to after verification (step 3 - e.g. `http://localhost:3000/login/github/callback`). After registering, make sure to save the client ID and secret.

You also want to find 2 endpoints in the documentation:

- Authorization endpoint: usually `/authorize`
- Token endpoint: usually `/access_token` or `/token`

## Authorization URL

Create an endpoint that redirects the user to the authorization endpoint. Add the following to the search params:

- `client_id`
- `redirect_uri`: The callback or redirect URI you defined when registering the app
- `state`
- `scope` (optional): If you have multiple scopes, separate them with spaces

Most OAuth providers require a `state`, a random string. Make sure to store the state in a cookie so we can access it later when the user is redirected back to your server. I'll mention what's it for in the next section.

Defining scopes allow you to access more user data. For example, to access the user's email for GitHub, I need to request the `user:email` scope.

```ts
app.get("/login/github", () => {
	const authorizationURL = new URL("https://github.com/login/oauth/authorize");

	// see below for generating state
	const state = generateState();

	authorizationURL.searchParams.set("client_id", CLIENT_ID);
	authorizationURL.searchParams.set("redirect_uri", "http://localhost:3000/login/github/callback");
	authorizationURL.searchParams.set("state", state);
	authorizationURL.searchParams.set("scope", "user:email repo");

	setCookie("github_oauth_state", state, {
		maxAge: 60 * 10, // 10 minutes
		httpOnly: true,
		path: "/",
		secure: true, // only add when deploying with https (prod)
		sameSite: "lax" // optional - do not use "strict"
	});

	return new Response(null, {
		status: 302,
		headers: {
			Location: authorizationURL.toString()
		}
	});
});
```

You can now create a simple login page:

```html
<h1>Sign in</h1>
<a href="/login/github">Sign in with GitHub </a>
```

### Generating state

The state should be a random string. Here's a basic way to create a cryptographically strong random string without any dependencies.

```ts
function createState(): string {
	// random 20 bytes
	const randomValues = crypto.getRandomValues(new Uint8Array(20));
	return encodeBase64url(randomValues);
}

function encodeBase64url(data: ArrayBuffer): string {
	return encodeBase64(data).replaceAll("+", "-").replaceAll("/", "_");
}

function encodeBase64(data: ArrayBuffer): string {
	let result = btoa(String.fromCharCode(...new Uint8Array(data)));
	return result;
}
```

For Node.js 16 and 18, you'll need to import `webcrypto` from the `crypto` Node module.

```ts
import { webcrypto } from "node:crypto";

function createState(): string {
	return encodeBase64url(webcrypto.getRandomValues(new Uint8Array(20)));
}

// ...
```

## Handle callback

The state and authorization code is available in the search params as `state` and `code`. Before exchanging the code, we'd need to verify state, which is simple as comparing the one stored as a cookie. The state allows us to verify that user/client who initiated the process (step 1) is the same user that the provider authenticated (step 2/3).

We can now send the code and client ID to the token endpoint (POST) to get the access token. The body type should be `application/x-www-form-urlencoded`, not JSON. Most providers also expect the client secret.

The endpoint will return an error response if one of the credentials were invalid. Since the RFC does not define an error status, we'll have to JSON parse the body to check for an error. You can find the [full list of error messages in the RFC](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2).

```ts
app.post("/login/github/callback", async (request: Request) => {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const storedState = getCookie("github_oauth_state");

	// validate state
	if (!code || !state || !storedState || state !== storedState) {
		// bad request
		return new Response(null, {
			status: 400
		});
	}

	// exchange code for access token
	const body = new URLSearchParams({
		grant_type: "authorization_code",
		code,
		client_id: CLIENT_ID,
		client_secret: CLIENT_SECRET,
		redirect_uri: "http://localhost:3000/login/github/callback"
	});

	try {
		const response = await fetch("https://github.com/login/oauth/access_token", {
			method: "POST",
			body,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json"
			}
		});
		const result = await response.json();
		if ("error" in result) {
			// invalid credentials, code, redirect uri
			console.log("Validation error", result.error);
			return new Response(null, {
				status: 400
			});
		}

		const accessToken = result.access_token;

		// ...
	} catch {
		// fetch error
		// JSON parse error
		return new Response(null, {
			status: 500
		});
	}

	// ...
});
```

### Client passwords

There are 2 ways to send the client secret. First is by just adding it in the body as shown above.

While this is the predominant way, the RFC recommends to use the HTTP basic authentication scheme. In fact, all providers must support this method, though I'm not sure if they all actually follow it. In this case, the client ID and secret should be concatenated and sent inside the `Authorization` header (the client ID should also be in the body).

```ts
const response = await fetch("https://github.com/login/oauth/access_token", {
	method: "POST",
	body,
	headers: {
		"Content-Type": "application/x-www-form-urlencoded",
		Accept: "application/json",
		Authorization: `Basic ${encodeBase64(CLIENT_ID + ":" + CLIENT_SECRET)}`
	}
});
```

## Refresh access tokens

Depending on your provider, the access token might be short lived. In this case, you may be issued a refresh token. Keep in mind that some providers, such as Google, only provide refresh tokens in the first response.

You can exchange a refresh token for a new access token, and sometimes another single-use refresh token, with the token endpoint. The steps are mostly the same as how we exchange the authorization code, but the grant type is `refresh_token` instead of `authorization_code`. Depending on your provider, you may omit the client id and/or secret. The example below sends the client ID inside the request body, but again, it may use the HTTP basic authentication scheme.

```ts
const body = new URLSearchParams({
	grant_type: "refresh_token",
	code,
	client_id: CLIENT_ID,
	client_secret: CLIENT_SECRET,
	redirect_uri: "http://localhost:3000/login/github/callback"
});

const response = await fetch("https://github.com/login/oauth/access_token", {
	method: "POST",
	body,
	headers: {
		"Content-Type": "application/x-www-form-urlencoded",
		Accept: "application/json"
	}
});
const result = await response.json();
if ("error" in result) {
	// invalid credentials, code, redirect uri
	console.log("Validation error", result.error);
	return new Response(null, {
		status: 400
	});
}

const accessToken = result.access_token;
```

## Give me something more simple

While the general idea is simple, it looks like something that a library can handle. So I've built 2 libraries!

### Oslo

[Oslo](https://oslo.js.org) provides basic utilities for auth, including OAuth 2.0. You can easily create authorization URLs, validate authorization codes, and refresh access tokens.

```ts
import { OAuth2Controller } from "oslo/oauth2";
import { generateState, generateCodeVerifier } from "oslo/oauth2";

const oauth2Controller = new OAuth2Controller(clientId, authorizeEndpoint, tokenEndpoint, {
	redirectURI: "http://localhost:3000/login/github/callback"
});

const state = generateState();
const url = await createAuthorizationURL({
	state,
	scope: ["user:email"]
});

const tokens = await oauth2Controller.validateAuthorizationCode(code, {
	credentials: clientSecret,
	authenticateWith: "request_body"
});
```

### Arctic

[Arctic](https://github.com/pilcrowonpaper/arctic), built on top of Oslo, provides wrappers for various OAuth providers. This is the fastest way to implement OAuth.

```ts
import { GitHub } from "arctic";
import { generateState } from "arctic";

const github = new GitHub(clientId, clientSecret, {
	scope: ["user:email"] // etc
});

const state = generateState();
const url = await github.createAuthorizationURL(state);

const tokens = await github.validateAuthorizationCode(code);
```
