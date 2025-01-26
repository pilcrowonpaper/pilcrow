---
title: "Dear OAuth providers"
date: "2024-12-11"
---

A short letter to some of the OAuth providers I've worked with.

## Dear GitHub

Your token endpoint returns a 200 status code even for errors. Error responses must use a 400 or 401 status code. Please fix it.

## Dear Facebook

Your token endpoint returns a custom error response.

```json
{
	"error": {
		"message": "Error validating access token: Session has expired on Wednesday, 14-Feb-18 18:00:00 PST. The current time is Thursday, 15-Feb-18 13:46:35 PST.",
		"type": "OAuthException",
		"code": 190,
		"error_subcode": 463,
		"fbtrace_id": "H2il2t5bn4e"
	}
}
```

It must be a JSON object with an `error` field. Please fix it.

```json
{
	"error": "invalid_request"
}
```

## Dear TikTok

Your server uses the `client_key` parameter instead of `client_id`. There's no reason why you had to deviate from the spec like this. Please fix it.

## Dear Strava

Your server uses a comma-delimitated list for the `scope` parameter.

```
scope=a,b,c
```

It should be a space-delimitated list. Please fix it.

```
scope=a%20b%20c
```

## Dear Naver

Your server, for whatever fucking reason, returns a string for the token expiration.

```json
{
	"access_token": "TOKEN",
	"expires_in": "3600"
}
```

This isn't about being spec-compliant anymore. I _need_ to know the thought process behind this decision. And also please fix it.

## Dear 42, Atlassian, Box, Coinbase, Dribble, Facebook, Kakao, Line, Linear, LinkedIn, Naver, osu!, Patreon, Shikimori, Start.gg, Strava, Tiltify, Twitch, VK, WorkOS

Please support HTTP basic auth for client authentication instead of just the `client_secret` parameter:

> The authorization server MUST support the HTTP Basic authentication scheme for authenticating clients that were issued a client password.

_Edit: I've been informed that HTTP basic auth is just optional in the upcoming OAuth 2.1 standard. However, since PKCE is required even for confidential clients in 2.1 and most of these providers don't even use PKCE, these providers aren't compliant to either specs._

_Edit 2: I had a "Dear AWS" section since I've received multiple bug reports on it when used with my OAuth client library. However, I couldn't recreate any of the reported issues so I have removed it from the post._
