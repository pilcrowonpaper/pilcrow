---
title: "The never-ending discussion of cookies vs. local storage"
description: "Should you use cookies or local storage for storing credentials?"
date: "2023-11-12"
---

If you're looking to store some data in the client, you have the option between cookies and local storage. For sensitive data, OWASP [recommends you to use cookies](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage):

> ...it's recommended to avoid storing any sensitive information in local storage where authentication would be assumed.

Why? You can trivially read all data stored in local storage with just a single line of code:

```ts
Object.entries(localStorage);
```

This means if your website is vulnerable to XSS attacks, where a third party can run arbitrary scripts, your users' tokens can be easily stolen. Cookies, on the other hand, can't be read by client-side JS if you add the `HttpOnly` flag.

So job done right? Use `HttpOnly` cookies.

And that's the common understanding. But if you look at large websites like Discord, you'd see that everything is stored in local storage. (You need to get a bit creative to read it though!) Didn't we just establish to always use cookies for sensitive data? As always, there's more nuance to it than what some people on Twitter might imply.

## Why not cookies?

### CSRF attack

The most common vulnerability with using cookies is CSRF, cross-site request forgery. This stems from the fact that:

1. Cookies are automatically added to requests, regardless of the origin
2. You can send forms across origins/domains

So, while you can't _read_ the cookie value, you can still _use_ the cookie. And you don't need a user to click the submit button either:

```html
<form action="https://bank.com/send-money" method="POST">
	<input name="amount" value="10000000" />
</form>
<script>
	document.forms[0].submit();
</script>
```

That all being said, you can prevent these attacks by:

1. Implementing anti-CSRF tokens
2. Checking the `Origin` header
3. Using `SameSite` cookie flags (for most use cases, go with `Lax` over `Strict`)

Make sure you don't have any GET endpoints that act like POST too.

### XSS attacks

Wait, aren't cookies safe from XSS attacks?

Similar to CSRF attacks, while you can't _read_ `HttpOnly` cookies, you can still _use_ the cookie on behalf of the user. Remember, cookies are automatically added to requests. If your website has a XSS vulnerability, an attacker can just send a fetch request:

```ts
fetch("https://bank.com/send-money", {
	method: "POST",
	body: JSON.stringify({
		amount: 10000000
	})
});
```

It's definitely possible to make it harder. But it's likely it can be bypassed with some targeted scripting, maybe using `fetch()` or `iframe`.

## I still prefer cookies

While cookies has its own issues, it has some benefits over local storage too. For XSS, while you're still vulnerable to targeted XSS attacks, you won't be as vulnerable to rogue third party dependencies. It's definitely easier to steal credentials when its stored in local storage.

More importantly however, persistence is guaranteed with cookies. Browsers, most notably Safari, automatically clear out local storage after a certain period of inactivity. Cookies also have a upper limit of around 1~2 years, but that's much easier to work with. And you can always keep re-setting cookies.

In short, for most websites:

- Use `HttpOnly`, `Secure`, `SameSite=Lax` cookie
- Prevent CSRF by checking the request origin
- Watch out for XSS vulnerabilities
