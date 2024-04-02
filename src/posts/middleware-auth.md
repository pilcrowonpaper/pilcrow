---
title: "Please stop using middleware to protect your routes"
description: "Stop overthinking and over-abstracting."
date: "2024-03-31"
---

When talking about auth, there seems be a certain group that's adamant on using middleware to handle authorization. Middleware here refers to functions that run before every request.

```ts
function isProtected(path: string) {
	return path !== "/login" && path !== "/signup";
}

app.middleware((req, res, next) => {
	if (!isProtected(req.path)) {
		return next();
	}
	const user = validateRequest(req);
	if (user) {
		return next();
	}
	res.writeHeader(401);
	res.write("Unauthorized");
});

app.get("/", (_, res) => {
	res.writeHeader(200);
	res.write("Secret message");
});
```

I do not like this approach at all.

I'm just confused at this point since you're just re-implementing routing logic within middleware, an API provided by your routing library. And what do you do when you need to protect routes based on user roles?

```ts
const adminOnlyRoutes = ["/admin/*"];

app.middleware((req, res, next) => {
	if (!isProtected(req.path)) {
		return next();
	}
	const user = validateRequest(req);
	if (user) {
		let requiresAdminRole = false;
		for (const route of adminOnlyRoutes) {
			requiresAdminRole = matchRoute(route, req.path);
		}
		if (requiresAdminRole && !user.admin) {
			res.writeHeader(401);
			return;
		}
		return next();
	}
	res.writeHeader(401);
});
```

While route-level middleware (middleware that only applies to certain routes) may help in this simple example, routes in real-world applications aren't often organized by their required permissions. What happens if you have multiple roles? What if you need to implement different rate-limiting on each route based on user roles? How about API access token permissions and scopes?

Abstractions aren't the problem here. The issue is that middleware is the wrong abstraction. It's just the most obvious solution that seems to make sense in a smaller scale.

But, we first have to answer: Do we need to abstract in the first place?

This goes beyond this rant but I feel, at least in the JavaScript ecosystem, people seems to go _too_ far on abstractions and "simplicity." It isn't surprising given how ~~loosey-goosey~~ powerful JS can be. Auth, which includes both authentication and authorization, seems to be particularly vulnerable to this since people are overtly scared of it. But auth is not an independent system from your application. It's an integral part of it that affects and is affected by everything else. This makes it extra-hard to abstract without introducing unwanted complexity since it any abstraction that's useful require some level of flexibility.

Getting back to the middleware discussion, why not just add the auth check on each route?

```ts
app.get("/", (req, res) => {
	// ...
	if (!user.admin) {
		res.writeHeader(401);
		return;
	}
	// ...
});
```

"B, b... but DRY! Abstractions!"

If you're too lazy to write some basic if checks, maybe that's a you problem. But on a serious note, if you need to abstract, use wrapper functions. This is a much better approach than middleware since you don't have to worry about routing. I also like that all the logic is defined in a single location instead of scattered across your project.

```ts
app.get(
	"/",
	protectedRoute((req, res, user) => {
		// ...
	})
);
```

If you deal with multiple permission level (e.g. roles, scopes), you can just create a helper function for checking them. Again, abstractions themselves aren't bad. You just need to implement them at the right level.

```ts
app.get("/", (req, res) => {
	// ...
	if (!hasPermission(user.role, ["moderator", "admin"])) {
		res.writeHeader(403);
		return;
	}
});
```

This doesn't mean middleware is useless. It works for global-level stuff like CSRF protection and providing data to each route. Actually, authenticating requests and passing the user object to each route is a great use of middleware (but letting each route handle authorization). But even then, you should probably replace it once you need to deal with exceptions and multiple patterns.

One common response I get to this opinion is that using middleware prevents developers from accidentally forgetting to add an auth check. **That's why you test your code**. You should be testing your auth logic regardless of your implementation. Given that, adding auth checks to each route is less bug-prone and easier to debug than forcing an abstraction with middleware.
