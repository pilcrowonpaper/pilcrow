---
title: "You really need to try Astro"
description: "Astro brings modern improvements to the web without the complexity."
date: "2023-09-17"
hidden: true
---

Last week I wrote about [my frustration with Next.js](/blog/nextjs-why). That got a lot more attention on Twitter than I had expected. Anyway, I wanted to write something positive next, and what's better than to write about my favorite framework: Astro.

## What's Astro?

Astro is a framework for building static and server-rendered sites with JavaScript. It's akin to Next.js and Gatsby, rather than a client-side framework like React. At the most basic, you define your HTML, CSS, and JS in a `.astro` file, which is a HTML template file (but not just that). This file gets rendered to a HTML file on build or on every request, depending on your rendering strategy.

```astro
---
const message = "Hello, world!";
---

<html>
	<head>
		<title>My page</title>
	</head>
	<body>
		<h1>{message}</h1>
	</body>
</html>
```

## In a nutshell

What makes Astro truly great is that it has everything you really need for building websites. And it's achieved in a modern, yet simple manner. It's not really shiny or cutting-edge, but everything is so straightforward that it requires no mental overhead and just works. I think the maintainers have made an excellent effort to keep their scope limited.

This is very blog, as well as the [docs for Lucia](https://lucia-auth.com), has been built with Astro. It's just such a joy to use.

## Great client side JS support

Astro allows you to import components from most major frameworks into `.astro` files. React, Vue, Svelte, SolidJS, Preact, Alpine, Lit, they all work! You can pass props and children, and even configure how they're rendered (SSR & CSR) and hydrated (on load, on visible, or fully static).

```astro
---
import ReactComponent from "@components/react.tsx";
import SvelteComponent from "@components/Svelte.svelte";
import VueComponent from "@components/Vue.vue";
---

<ReactComponent />
<SvelteComponent message="hello" />
<VueComponent>
	<p>Some static HTML</p>
</VueComponent>
```

But one underrated part of Astro is `<script/>` - it supports TypeScript _and_ NPM modules! I actually write a lot of my client side behaviors in regular script tags instead of using a UI component because of this.

```astro
---

---

<script>
	import { fn } from "./local";
	import package from "some-package";

	const t: string = fn();
</script>
```

## Not just static

Astro's main focus is static content, but it actually has a pretty decent server-side features, including API routes, Middleware, and APIs for handling cookies. It's on-par with or sometimes even better than existing frameworks. But it doesn't have anything magical like form actions in React Server Components. At the end of the day, you're just building a basic HTTP server, and Astro doesn't hide that; it just polishes the experience.

```ts
// pages/api.ts

export const GET: APIRoute = async (context) => {
	const user = context.locals.user; // object populated in middleware
	const query = context.url.searchParams.get("q");
	const preference = context.cookies.get("preference");
	// ...
	return new Response();
};
```

You can deploy your site anywhere you want with adapters, including Node.js, serverless platforms, and the Edge (ie. V8 runtime running in servers around the world).

## `.astro` files

`.astro` files aren't just for representing pages; they're components too. That means you can import them as components and pass props and children like any other component system.

```astro
---
import AstroComponent from "@components/Astro.astro";
---

<AstroComponent message="hello">
	<p>Some static HTML</p>
</AstroComponent>
```

It even supports JSX! Though, I kinda prefer having utility components for handling control-flow like in Solid.js.

```astro
---
const posts = [
	{
		title: "Why you should use TypeScript",
		href: "/posts/1"
	},
	{
		title: "Why you should avoid TypeScript",
		href: "/posts/2"
	}
];
---

{
	posts.map((post) => {
		return <a href={post.href}>{post.title}</a>;
	})
}
```

## Other small features

- Built in markdown and MDX support
- Built in code blocks **with syntax highlighting**
- Tailwind plugin
- Great plugin API
- Directives for setting HTML classes dynamically
- Package for RSS
- Image optimization

## Awesome community

Astro might have one of the most chill and nicest community in web dev. They don't care if you like React or Svelte, TypeScript or JavaScript, or vanilla CSS or Tailwind. Everyone's welcomed. The docs are one of the best in the industry; it's clear how much effort when into them. And it has very big localization team too. They're available in all major languages, including Japanese, where I've given back to the community by reviewing some PRs for it.

Finally, all the maintainers are great and super active, from the whiteboard guy to the CEO of HTML and the fuzzy bear. Shout out to the compiler, docs, and language-server team as well!
