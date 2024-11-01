---
title: "Implementing passkeys with just TypeScript and Web APIs"
description: "Experimenting with passkeys on the browser, and some thoughts on it."
date: "2023-8-1"
hidden: true
---

> This page has numerous grammatical and technical mistakes. Refer to the guide in [the Copenhagen Book](https://thecopenhagenbook.com/passkeys).

While working on Lucia, I had a few feature requests for passkey support. Passkeys allow users to sign in using their device via biometrics or device PIN instead of regular passwords.

To learn how it works, I decided to implement a simple demo using TypeScript. I also thought it would be a fun challenge to implement it from scratch using Wev APIs since I recently implemented JWT and Apple OAuth with the same constraints.

Here are the links to the [demo](https://browser-passkey-demo.vercel.app) and the [Github repo](https://github.com/pilcrowOnPaper/browser-passkey-demo).

## Web Crypto API

The Web Crypto API is Node.js' `crypto` module but in the browser. It's actually pretty powerful for a browser API, and it can handle various operations like hashing, encryption, and verification.

```ts
// HMAC SHA-256 hash
const hash = await crypto.subtle.digest("SHA-256", data);
```

If you're thinking about trying it out, make sure you're ready to get used to `ArrayBuffer`s and `Uint8Array`s.

## Overview

In a basic username and password authentication, the user's username (identifier) and hashed password is stored in a database. When signing in, the user's hashed password is retrieved using their username and compared against the hash stored in the database. If it matches, the user is authenticated.

```ts
function signUp(username: string, password: string) {
	const existingUser = getUserByUsername(username);
	if (existingUser) throw new Error("Username already used");
	createUser({
		username,
		hashedPassword: hashPassword(password)
	});
}

function signIn(username: string, password: string) {
	const user = getUserByUsername(username);
	const validPassword = verifyHash(user.hashedPassword, password);
	if (!validPassword) throw new Error("Invalid password");
}
```

When using passkeys, the user's device creates a new credential with a pair of public and private key. The private key is securely stored on the user's device, and the public key and the credential id is stored in the database.

When signing in, the user's device verifies the identity of the user (e.g. using their fingerprint), and if successful, it creates a new signature with the private key. This signature can be verified using the user's public key, which can be retrieved with the credential id.

```ts
function signUp(username: string) {
	const existingUser = getUserByUsername(username);
	if (existingUser) throw new Error("Username already used");
	const passkeyCredential = createPasskey(username);
	createUser({
		credentialId: passkeyCredential.id,
		publicKey: passkeyCredential.publicKey
	});
}

function signIn() {
	const passkeyCredential = getPasskey();
	const user = getUserByCredentialId(passkeyCredential.id);
	const validCredential = verifySignature(passkeyCredential.signature, user.publicKey);
	if (!validCredential) throw new Error("Invalid passkey");
}
```

## Sign up user

We first need to generate a challenge, stored in a database, and sent to the client. This will be sent back with the passkey credential to prevent replay attacks.

```ts
// recommend minimum 16 bytes
const challenge = crypto.getRandomValues(new Uint8Array(32));
```

On the client, `navigator.credentials.create()` will create a new passkey on the device and return `PublicKeyCredential`.

- `rp.name`: Relying party name - your application's name
- `user.id`: Something unique to the user - no personal info (usernames, emails, etc)
- `user.name`: Something unique to the user (username, email, etc)
- `pubKeyCredParams`: Algorithm to use

I went with algorithm `-7`, or ECDSA with the secp256k1 curve and the SHA-256 (aka. ES256K). I _think_ this is the most commonly used and supported option. Anyway, this number is the algorithm id from the [IANA COSE Algorithms registry](https://www.iana.org/assignments/cose/cose.xhtml).

```ts
const publicKeyCredential = await navigator.credentials.create({
	// publicKey = Web Authentication API
	publicKey: {
		rp: { name: "Passkey Demo" },
		user: {
			id: crypto.getRandomValues(new Uint8Array(32)),
			name: username,
			displayName: username
		},
		pubKeyCredParams: [
			{
				type: "public-key",
				// use ECDSA with the secp256k1 curve and the SHA-256 (aka. ES256K)
				// id from the IANA COSE Algorithms registry
				alg: -7
			}
		],
		challenge
	}
});
if (!(publicKeyCredential instanceof PublicKeyCredential)) {
	throw new TypeError();
}
if (!(publicKeyCredential.response instanceof AuthenticatorAttestationResponse)) {
	throw new TypeError("Unexpected attestation response");
}
```

This returns a `PublicKeyCredential`, which should be sent to the server.

We can verify the attestation here, but I'm going to skip it since it's not really necessary for a majority of websites, and there are like 7 difference verification patterns. `navigator.credentials.create()` defaults to skipping the verification anyway (see `attestation` option).

Finally, create a new user with the credential id (already base64url encoded) and the public key (base64url encoded).

```ts
const userId = generateId(8);
const publicKey = publicKeyCredential.response.getPublicKey();
if (!publicKey) {
	throw new Error("Could not retrieve public key");
}
insertUser({
	id: userId,
	credential_id: publicKeyCredential.id, // base64url encoded
	username,
	public_key: encodeBase64Url(publicKey)
});
```

## Authenticate user

Again, we need to generate a challenge and store it on the server, and send it back to the client. `navigator.credentials.get()` will prompt the user to pick an account (if they have multiple) and verifies their identity. If successful, it will return a `PublicKeyCredential`.

```ts
const publicKeyCredential = await navigator.credentials.get({
	publicKey: {
		challenge
	}
});
if (!(publicKeyCredential instanceof PublicKeyCredential)) {
	throw new TypeError();
}
```

### Verifying Assertion

This step verifies the user's credentials and the origin of it. There are 3 parts of the assertion that needs to be verified:

1. The client data
2. The authenticator data
3. The signature

Verifying the signature also verifies the legitimacy of the client and authenticator data. I'm not sure if step 1 & 2 are really necessary and your application won't be any weaker than a regular password based authentication if you omit them, but I've included them here as just part of "good practice."

```ts
const user = getUserByCredentialId(publicKeyCredential.id);
if (!user) throw new Error("User does not exist");
const publicKey = decodeBase64url(user.publicKey);

const response = publicKeyCredential.response;
if (!(response instanceof AuthenticatorAssertionResponse)) {
	throw new TypeError();
}

const clientData = JSON.parse(utf8Decode(response.clientDataJSON)) as {
	type: string;
	challenge: string; // base64url encoded challenge
	origin: string; // url origin
};
if (clientData.type !== "webauthn.get") {
	throw new Error("Failed to verify 'clientData.type'");
}
if (clientData.challenge !== encodeBase64Url(options.challenge)) {
	throw new Error("Failed to verify 'clientData.challenge'");
}
if (clientData.origin !== window.location.origin) {
	throw new Error("Failed to verify 'clientData.origin");
}

const authData = new Uint8Array(response.authenticatorData);
if (authData.byteLength < 37) {
	throw new Error("Malformed 'authData'");
}
const rpIdHash = authData.slice(0, 32);
const rpIdData = new TextEncoder().encode(window.location.hostname);
const expectedRpIdHash = await crypto.subtle.digest("SHA-256", rpIdData);
// compare buffer
if (!compare(rpIdHash, expectedRpIdHash)) {
	throw new Error("Failed to verify 'rpId' hash");
}
const flagsBits = authData[32].toString(2);
if (flagsBits.charAt(flagsBits.length - 1) !== "1") {
	throw new Error("Failed to verify user present flag");
}

// the signature is encoded in DER
// so we need to convert into ECDSA compatible format
const signature = convertDERSignatureToECDSASignature(response.signature);
const hash = await crypto.subtle.digest("SHA-256", response.clientDataJSON);
const data = concatenateBuffer(authData, hash);
const verifiedSignature = await crypto.subtle.verify(
	{
		name: "ECDSA",
		hash: "SHA-256"
	},
	await crypto.subtle.importKey(
		"spki",
		publicKey,
		{
			name: "ECDSA",
			namedCurve: "P-256"
		},
		true,
		["verify"]
	),
	signature,
	data
);
if (!verifiedSignature) {
	throw new Error("Failed to verify signature");
}
```

### Verify client data

`clientData` can be retrieved by JSON parsing the utf decode of `clientDataJSON`.

- `type`: Should be `"webauthn.create"`
- `challenge`: Should be equal to the base64url encoded challenge
- `origin`: Should be your application origin (e.g. `http://localhost:3000`)

### Verify authenticator data

`authData` is a buffer that's at least 37 bytes. These can be separated into at least 3 individual parts, 2 of which we need to check when using passkeys.

#### Relying party id

The relying party id is the hostname of your application by default (e.g. `http://example.com:3000` => `example.com`). The hash of it can be created with the Web Crypto API. The attestation also includes the hash of it inside the first 32 bytes of `authData`. This hash should match the expected hash.

#### User present flag

The 33rd byte of `authData` is where the flags are stored as a binary. The least significant bit (most right side) should equal to 1 (user is present).

### Extract the signature

This is where I was stuck for like 3 hours. You'd expect that you'll be able to use the signature from the assertion as is. But nope.

The signature is in the "Distinguished Encoding Rules" (DER) format. This stores the data like below, with a length of around 70 bytes.

| byte length | description                                  | value |
| ----------- | -------------------------------------------- | ----- |
| 1           | header byte                                  | `48`  |
| 1           | total byte length (excluding the first byte) |       |
| 1           | header byte indicating an integer            | `2`   |
| 1           | `r` value byte length                        |       |
| around 32   | `r` value (integer)                          |       |
| 1           | header byte indicating an integer            | `2`   |
| 1           | `s` value byte length                        |       |
| around 32   | `s` value (integer)                          |       |

The algorithm I've used was ES256K (algorithm id `-7`) which expects and concatenation of the `r` and `s` value, both of which are 32 bytes unsigned integer.

```
SEQUENCE:
r value (32 byte integer)
s value (32 byte integer)
```

In code, it'd look like this:

```ts
function convertDERSignatureToECDSASignature(DERSignature: ArrayLike<number> | ArrayBufferLike): ArrayBuffer {
	const signatureBytes = new Uint8Array(DERSignature);

	const rStart = 4;
	const rLength = signatureBytes[3];
	const rEnd = rStart + rLength;
	const DEREncodedR = signatureBytes.slice(rStart, rEnd);
	// DER encoded 32 bytes integers can have leading 0x00s or be smaller than 32 bytes
	const r = decodeDERInteger(DEREncodedR, 32);

	const sStart = rEnd + 2;
	const sEnd = signatureBytes.byteLength;
	const DEREncodedS = signatureBytes.slice(sStart, sEnd);
	// repeat the process
	const s = decodeDERInteger(DEREncodedS, 32);

	const ECDSASignature = new Uint8Array([...r, ...s]);
	return ECDSASignature.buffer;
}
```

But... integers in DER format can be smaller or larger (with leading 0s) than the expected size (in this case 32 bytes)! So they need to be transformed into 32 bytes.

```ts
function decodeDERInteger(integerBytes: Uint8Array, expectedLength: number): Uint8Array {
	if (integerBytes.byteLength === expectedLength) return integerBytes;
	if (integerBytes.byteLength < expectedLength) {
		return concatenateUint8Array(
			// add leading 0x00s if smaller than expected length
			new Uint8Array(expectedLength - integerBytes.byteLength).fill(0),
			integerBytes
		);
	}
	// remove leading 0x00s if larger then expected length
	return integerBytes.slice(-32);
}
```

### Verify the signature

Finally, after all that, the signature can be verified. The data we need to verify over is the concatenation of the `authData` and the hash of `clientDataJSON`.

```ts
const hash = await crypto.subtle.digest("SHA-256", response.clientDataJSON);
const data = concatenateBuffer(authData, hash);
```

Since the public key is also DER encoded, it needs to be imported by defining the format as `spki` (fun fact: it's pronounced _spooky_). If the credential is valid, `verify()` will return `true`.

```ts
const verifiedSignature = await crypto.subtle.verify(
	{
		name: "ECDSA",
		hash: "SHA-256"
	},
	await crypto.subtle.importKey(
		"spki",
		publicKey,
		{
			name: "ECDSA",
			namedCurve: "P-256"
		},
		true,
		["verify"]
	),
	signature,
	data
);
if (!verifiedSignature) {
	throw new Error("Failed to verify assertion");
}
```

## Final thoughts

I had a lot of fun working on this and got to learn more about the Web Crypto API and cryptography in general.

I like the concept of passkeys but I think the biggest hurdle preventing it from becoming more mainstream is that it's just way too complex. It really doesn't help that it's built on top of the already complicated Web Authentication standard (WebAuthn).

The big issue is that WebAuthn was originally built for verifying _devices_, while passkeys are for verifying _users_. Users should be able to share passkeys across devices.
That difference in requirements makes significant part of the API redundant and unnecessary when working with passkeys. There were also people that could not get the demo to work on Android, so I'm skeptical of how well it works in a real application. Anyway, I really think it should've been a different standard all together, and it could've been as simple as implementing a password manager in the web. The device generates a new password, stores it, and lets the developer handle the actual verification. This won't be as secure as the current implementation but should be sufficient when common security measures are taken.

```ts
function signUp(username: string) {
     // device generates and stores the password
	const credential = createCredential(username);
	await createUser({
        username,
        password: credential.password
    });
}

function signIn () {
    // device verifies the user and retrieves the username/password
    const credential = getCredential():
    await createUser({
        username: credential.id,
        password: credential.password
    });
}
```

Another big issue is that there are rarely any resources or tutorials on it. I had to heavily rely on the [W3C specifications](https://www.w3.org/TR/webauthn/). And I think that's the case for authentication on the web as a whole.
