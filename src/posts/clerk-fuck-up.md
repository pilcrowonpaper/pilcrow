---
title: "How a major auth provider fucked up"
description: "Investigating a major security vulnerability with Clerk's Next.js integration."
date: "2024-01-26"
---

On January 12th 2024, Clerk disclosed a major security vulnerability with their Next.js integration. Clerk is an auth provider similar to Auth0 and Firebase Auth, and Next.js is a popular JavaScript framework for building websites with React. While they did not publicly share the details of the vulnerability in the disclosure, the severity was immediately obvious. It allowed malicious actors to act on behalf of other users and had a CVSS score of 9.4 (critical). If you're using the `@clerk/nextjs` package, you should update it to the latest version immediately.

I got curious and went through the source code to find the vulnerability myself. And what I found was horrifying. You could impersonate any users just with their user ID as long as you had any valid session token. And worse, it didn't take much effort.

So, what the fuck happened?

> Before I get into the details, I have not verified this finding with Clerk. That said, it has been fixed in the patch they published so I'm fairly confident this was the issue (or at least part of it).

## The exploit

To understand the issue, you need to know about JWTs. A JWT, or JSON web token, is a token with some JSON data (such as user ID) and a signature embedded into it. The signature allows you to verify the integrity of the token using a private key. Session tokens issued by Clerk uses JWTs and it stores user data such as user ID (unrelated, but I do not recommend using JWTs as session tokens).

```ts
// Example JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoZWxsbyJ9.YMxTsTS6Ndzb9IXjVoGrSrYcIFVd09WtLufoQjAGkaw
// The token consists of 3 parts (header, payload, signature) separated by a period.
// Each part is base64url encoded.
const parts = decodeJWT(jwt);
const isValid = await verifyPayload(parts.payload, parts.signature, secretKey);
if (isValid) {
	// user is authenticated
	const currentUserId = json(parts.payload).sub;
}
```

Usually, you need the private key to create your own JWT as the signature would be invalid. But what if the application didn't check the signature at all? Or rather, what if it assumed the token signature had been already verified? That's exactly what happened.

You first sign in to get a valid session token. Next, create a JWT token for the user you want to impersonate. Importantly, you don't need to the signature part to be valid.

```json
// the payload would look something like this
{
	"sub": "admin_user_id"
}
```

You can then send both the valid and invalid JWT at the same time. This is possible because Clerk allows you to use send session tokens both as cookies and in the HTTP `Authorization` header.

```
GET https://example.com
Authorization: <VALID_JWT>
Cookie: __session=<FAKE_JWT>
```

Clerk validated the valid token in the authorization header, but when getting the current user ID, parsed the invalid cookie that we created instead without validating it. Why did it need to read the token from the request _twice_?

## How it happened

Next.js has a thing called middleware. Similar to middleware in every other routing library, it allows you to intercept and run code on every request. The integration read and validated the token here. But unlike every other library, it's designed to be ran on a different server than the main machine - the Edge™. It's pretty much a CDN that runs your code. This means that Next.js doesn't provide a mechanism to share data between middleware and route handlers. So a popular hack is to modify the request and add a custom header.

```ts
// middleware
export async function middleware(request: Request): Promise<Response> {
	const user: User | null = await validateRequest(request);
	const headers = new Headers(request.headers);
	if (user) {
		headers.set("X-Is-Authenticated", "true");
	} else {
		headers.set("X-Is-Authenticated", "false");
	}
	// send the request to the actual request handlers
	return NextResponse.next({
		request: {
			// New request headers
			headers: requestHeaders
		}
	});
}
```

```ts
// handle GET requests
export async function GET(request: Request): Promise<Response> {
	const isAuthenticated = Boolean(request.headers.get("X-Is-Authenticated"));
	// ...
}
```

This in itself is fine. Clerk's mistake was how it got the current user. I've simplified the code, but do you see the issue?

```ts
// middleware
export async function middleware(request: Request): Promise<Response> {
	const session = await validateRequest(request);
	const headers = new Headers(request.headers);
	if (session) {
		headers.set("X-Is-Authenticated", "true");
	} else {
		headers.set("X-Is-Authenticated", "false");
	}
	// get response from request handlers
	return NextResponse.next({
		request: {
			// New request headers
			headers
		}
	});
}

async function validateRequest(request: Request): Promise<Session | null> {
	let sessionToken = getSessionCookie(request);
	let session = await validateSessionToken(sessionToken ?? "");
	if (session) {
		return session;
	}
	sessionToken = getSessionTokenFromAuthorizationHeader(request);
	session = await validateSessionToken(sessionToken ?? "");
	if (session) {
		return session;
	}
	return null;
}

async function validateSessionToken(token: string): Promise<User | null> {
	// validate signature
	const token = await validateJWT(token);
	if (!token) {
		return null;
	}
	return token.payload as User;
}
```

```ts
// request GET requests
export async function GET(request: Request): Promise<Response> {
	const session = getSession(request);
	if (session) {
		// authenticated
		const userId = session.userId;
	}
}

function getUser(request: Request): Promise<Session | null> {
	const isAuthenticated = Boolean(request.headers.get("X-Is-Authenticated"));
	if (!isAuthenticated) {
		return null;
	}
	let sessionToken = getSessionCookie(request);
	if (sessionToken) {
		// read the payload without validating the signature
		return parseJWT(token)?.payload ?? null;
	}
	return null;
}
```

When getting the current user, it assumed the session token had been already validated. To be more specific, it assumed all tokens had been validated. In reality, only one, either the one as the cookie or in the authorization header, had been. The fix then was to store the validated token and use that when getting the current session.

```ts
// middleware
export async function middleware(request: Request): Promise<Response> {
	const session = await validateRequest(request);
	const headers = new Headers(request.headers);
	if (session) {
		headers.set("X-Is-Authenticated", "true");
		headers.set("X-Session-Token", session.token);
	} else {
		headers.set("X-Is-Authenticated", "false");
		headers.set("X-Session-Token", "");
	}
	// ...
}
```

```ts
// request GET requests
export async function GET(request: Request): Promise<Response> {
	const session = getSession(request);
	if (session) {
		// authenticated
		const userId = session.userId;
	}
}

function getUser(request: Request): Promise<Session | null> {
	const isAuthenticated = Boolean(request.headers.get("X-Is-Authenticated"));
	if (!isAuthenticated) {
		return null;
	}
	let sessionToken = request.headers.get("X-Session-Token");
	if (sessionToken) {
		// read the payload without validating the signature
		return parseJWT(token)?.payload ?? null;
	}
}
```

## Closing thoughts

To Clerk's credit, they quickly released a patch and worked with major hosting providers (Cloudflare, Netlify, and Vercel) to patch the issue on the network level.

This vulnerability only existed in Next.js. And it's obvious why. This wouldn't have been possible in the first place if Next.js/Vercel:

1. just implemented middleware normally.
2. didn't pretend their middleware is comparable to middleware in other frameworks/libraries.
3. provided a built-in way to share data between middleware and route handlers.
