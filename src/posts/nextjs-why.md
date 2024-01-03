---
title: "Next.js, just why?"
description: "Next.js has been one of the most frustrating frameworks I've ever worked with."
date: "2023-09-09"
---

I don't want this to be just a rant. I really don't. But out of all the frameworks I've worked with for Lucia, Next.js has been consistently infuriating to work with. And it hasn't improved in months.

In Lucia, `Auth.handleRequest()` is a method that creates a new `AuthRequest` instance, which includes the method `AuthRequest.validate()`. This checks if the request is coming from a trusted origin (CSRF protection), validates the session cookie, and sets a new cookie if required (this is optional). At a minimum, this requires the request URL or host, request method, and request headers. This shouldn't be an issue since most, if not all JS frameworks (Express, SvelteKit, Astro, Nuxt, etc.) provide you with some request object, usually either a `Request` or `IncomingMessage`.

And then there's Next.js.

## Next.js 12

Next.js 12 and the Pages Router were fine. You get access to `IncomingMessage` and `OutgoingMessage` inside `getServerSideProps()`, which allows you to run some code in the server before SSR-ing the page.

```ts
export const getServerSideProps = async (req: IncomingMessage, res: OutgoingMessage) => {
	req.headers.cookie; // read header
	res.setHeader("Set-Cookie", cookie.serialize()); // set cookie
	return {};
};
```

There were few issues with it however. First, you just can't set cookies when you deploy the page to the Edge. You just can't. I'm not sure about the history of Next.js, but it looks to me that the API wasn't thought out very well. Another issue is that the middleware uses the web standard `Request`. Props to the Next.js team for transitioning to web standards, but I'd argue it just made things worse with inconsistent APIs (`IncomingMessage` vs `Request`). But, at the end of the way, it works... I guess.

## Next.js 13

Next.js being production-ready is a joke.

Next.js 13 introduced a new router - the App Router. All components inside it are React Server Components by default so they always run on the server. Everything is rendered on the server and gets sent to the client as pure HTML.

```tsx
// app/page.tsx
const Page = async () => {
	console.log("I always run on the server"); // only gets logged in the server
	return <h1>Hello world!</h1>;
};
```

If you've ever used Remix, SvelteKit, or Astro, it's similar to the loader pattern. If you've used Express or Express-like libraries, it's just an `app.get("/", handler)`. So you'd expect to get the request or a request-context object to be passed to the function... right? Right?

```tsx
// app/page.tsx
// something along this line
const Page = async (request) => {
	console.log(request);
	return <h1>Hello world!</h1>;
};
```

## Inconsistent APIs

So, how do you get the request inside your pages? Well here's the thing, you can't! Yup, what a genius idea! Let's go all in with servers and not let your users access the request object.

Actually, they do, but don't. They do provide `cookies()` and `headers()`, which you need import for some reason.

```tsx
// app/page.tsx
import { cookies, headers } from "next/headers";

const Page = async () => {
	cookies().get("session"); // get cookie
	headers().get("Origin"); //get header
	return <h1>Hello world!</h1>;
};
```

Ok fine. Maybe there's a great reason why they can't just pass them as arguments. But then why would you only provide an API for accessing cookies and headers? Just export a `request()` that returns a `Request` or the request context?. This makes less sense when realize that API route handlers and middleware lets you access the `Request` object.

```ts
// app/api/index.ts
export const GET = async (request: Request) => {
	// ...
};
```

And here's the fun part. You can't use `cookies()` and `headers()` inside middleware (`middleware.ts`)!

Just provide us with a single API to interact with incoming requests.

## Arbitrary limitations

Remember how you couldn't set cookies in `getServerSideProps()` when the page runs on the Edge? Well, with the App Router you can't set cookies when rendering pages, period. Not even when running on Node.js. Wait, why can't we use `cookies()`?

```tsx
// app/page.tsx
import { cookies } from "next/headers";

const Page = async () => {
	cookies().set("cookie1", "foo");
	return <h1>Hello world!</h1>;
};
```

They expose the `set()` method but you get an error when you try do this! Why???? I cannot come up with a single valid reason why this restriction is necessary. SvelteKit does this fine. Every HTTP frameworks do this fine. Even Astro, the framework that focuses on static-sites (or used to anyway), did this fine before 1.0.

Also, `headers()` is always read-only, unlike `cookies()` which can set cookies inside API routes. Another consistency issue.

My final gripe is with middleware. Why does it always run on the Edge? Why limit it from running database queries or using Node.js modules? It just makes everything complicated and it makes passing state between middleware and routes impossible - something Express, SvelteKit, and again, even Astro can do.

## Just, why?

All these little issues add up and just make supporting Next.js as a library author frustrating at best, and near-impossible at worst. The slow boot-up and compilation time, as well as buggy dev servers, just make using Next.js in general not enjoyable. Caching is a whole another issue I didn't touch too.

I don't want to assume anything malicious on Next.js' or Vercel's end, but they just seem to outright ignore issues on setting cookies inside `page.tsx`. Their dev-rel is pretty good at responding on GitHub and Twitter, but they haven't responded to any tweets or Github issues on the matter. Their dev-rel and even the CEO reached out to me to ask if they were anything that could be improved, and I mentioned the cookie issue, and no response. I even tweeted out to them multiple times. Like I don't expect any changes, especially immediately, but some kind of acknowledgment would be nice.

Like, I get it. I shouldn't expect anything from open-source projects. I'm a library author myself. But come on. It's a massive framework backed by a massive company. Is it bad to have some expectations?

I think the root cause is 2 folds. First, a rushed release. Documentation is still spotty and everything seems to be incomplete to a varying degree. And second, React, and server components specifically. React still tries to be a library when it's definitely a framework at this point. The goo of Next.js APIs and React APIs with overlapping responsibilities in the server isn't working. React needs to embrace a single framework, whether it be their own or Next.js, and fully commit to it.

_Update: I've been told a some of these issues stem from streaming. You can't set status codes and headers after streaming has started (everything is streamed in RSCs). I don't see how that makes anything better. It just makes them look worse; they were aware of the issue yet built a whole framework around it without addressing it._
