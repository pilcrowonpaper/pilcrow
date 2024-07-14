---
title: "How I would do auth"
description: "A quick blog on how I would implement auth for my applications."
date: "2024-07-14"
---

This is a quick post on how I would implement auth for a public-facing app. This won't be anything too in-depth or definitive - just a collection of my current opinions. It might be useful as a starting guide for some people though.

First, if the application is for devs and I need something very quick, I would just use GitHub OAuth. Done in 10 minutes.

Now to the main part - how would I implement password-based auth? The minimum for me would be password with 2FA using authenticator apps. Passkeys aren't widespread enough and I just find magic-links annoying.

> Always implement rate-limiting, even if it's something very basic!

## Session management

Database sessions 100%. I really, really don't like JWTs and they shouldn't be used as sessions majority of times.

Assuming I only have to deal with authenticated sessions, my preferred approach is 30 days expiration but the expiration gets extended every time the session is used. This ensures active users stay authenticated while inactive users are signed out.

## Registration

Hot take - I think it's fine for apps to share whether an email exists in their system or not. If the email is already taken, just tell the user that they already have an account. Significantly better UX for minimal security loss. Don't use emails for auth if you don't like that.

Anyway, something more important than preventing user enumeration is checking passwords against previous leaks. The [`haveibeenpwned.com`](https://haveibeenpwned.com) API is probably the best option for this. This will reduce the effectiveness of credential stuffing attacks, where an attacker targets accounts using leaked passwords from other websites.

Passwords are hashed with either Argon2id or Scrypt - they're both good enough. Bcrypt is ok but it unfortunately has a 50-70 character limit.

Rate limiting will be set to around 1 attempt per second per IP address. Captchas if I start to get spams.

### Email verification

First of all, I wouldn't bother with those 100 character long regex. Here's the only email regex you'll ever need:

```
^.+@.+\..+$
```

I would also check if the email starts or ends with a space just to make sure the user didn't mistype it.

I personally prefer OTPs for email verification over links, but both work fine. For OTPs, a basic throttling like 5-10 attempts per hour per account should be good enough. The code will be valid for 10, maybe 15 minutes. For verification links, I'd set the expiration to 2 hours.

Here's some ways I would generate those OTPs:

```go
bytes := make([]byte, 5)
rand.Read(bytes)
// 8 characters, 40 bits of entropy
// I might use a custom character set to remove 1, I, 0, and O.
otp := base32.StdEncoding.EncodeToString(bytes)
```

```ts
// 8 characters, entropy equivalent to ~26 bits
// This introduces a tiny bias.
// See RFC 4226 for why this is fine.
bytes := make([]byte, 4)
rand.Read(bytes)
num := int(binary.BigEndian.Uint32(bytes) % 100000000)
otp := fmt.Sprintf("%08d", num)
```

## Login

Again, if the email is invalid, just return "Account does not exist."

Login throttling will be based on emails. Increase the timeout period until 5-10 minutes (e.g. 1, 2, 4, 8, 15, 30, 60, 120, 300 seconds). You don't want to make it longer than that to prevents attackers from blocking legitimate attempt by purposely failing. Rate limiting based on IP addresses will be set to 1 attempt per second per IP. Multiple users can share IP addresses so I don't want to be too strict here. I'm not too worried about login throttling anyway since we check for passwords strengths during registration and we have 2FA enabled.

I might consider implementing [device cookies](https://owasp.org/www-community/Slow_Down_Online_Guessing_Attacks_with_Device_Cookies) if I'm really worried about account-lockouts, though I probably need to monitor requests and manually block requests if I'm dealing with a such attacks anyway.

## 2FA

2FA is a must have for me. 2FA via authenticator apps (TOTP) should always be available. It's relatively easy for users to use and for me to implement. Passkeys and security keys would be my next priority (users that register passkeys should be allowed to use them instead of password+2FA too). On the other hand, SMS is expensive and vulnerable to SIM-swapping. I would just avoid it. No one likes them anyway.

For TOTP, again a basic throttling like 5-10 attempts per hour per account should be good enough. For passkeys, maybe 1 attempt per second per IP address. Brute forcing passkeys is impossible but verifying signatures is somewhat resource intensive so it may be vulnerable to DoS attacks.

> Passkeys can be used as a second-factor and as an alternative to passwords, but security keys should only be used as a second-factor.

Optional, but if I were to implement recovery codes, I would generate 5 or 10 bytes and base32 encode like I showed in the email verification section. Hash them with either Argon2id/Scrypt, and give users the option to regenerate them anytime. It would be single-use and using it will disconnect all 2FA methods tied to the account. I would be pretty strict with the attempt count here and set it 5 attempts per hour or even day per account.

Finally, the users should authenticate using one of their second factor before they're allowed to edit their 2FA methods. This would start to get annoying for the user though so I'd only require it every hour (or less) by storing the last time they used 2FA in the session.

## Password reset

Again, I'm fine with telling the user if the email is valid or not.

Login throttling and rate limiting would be pretty similar to login and will be based on both email and IP addresses. Add a Captcha if necessary.

Both single-use OTPs and links work and their expiration will be similar to email verification. I would hash the code or token just to be safe, especially since it's not really hard.

2FA should be required even for password resets.

## Did I miss anything?

Let me know on Twitter or Discord if there's anything I should add to the post!
