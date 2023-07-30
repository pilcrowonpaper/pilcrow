---
title: "Implementing passkeys with just TypeScript and Web APIs"
description: "What's passkeys and how can I implement it?"
date: "2023-7-30"
---

While working on Lucia, I had some feature requests for passkey requests. Passkeys allow users to sign in using their device via biometrics or device passwords.

So I decided to implement a simple demo with TypeScript, hopefully without a server. In production you should of course use a server, but I thought it was cool if I could do it only using Web APIs.

A [full demo]() and [its source code on Github]() is available (uses Astro for TypeScript support). If you'd like to implement this yourself following this blog post, some utility functions I used are shared at the very end.

## WebCrypto API

Have you heard of the Web Crypto API? For an API for the browser, it's actually a pretty powerful API for handling various crypto operations like hashing, encryption, and verification. I can also share it without hosting a proper database since I can just use local storage.

```ts
// HMAC SHA-256 hash
const hash = await crypto.subtle.digest("SHA-256", data);
```

If you're thinking about trying it out, get ready to get used to `ArrayBuffer`s and `Uint8Array`s.

## Overview

In a basic username and password authentication, the user's username (identifier) and hashed password is stored in a database. When signing in, the user's hashed password is retrieved using their username and compares it against the hash stored in the database. If it matches, the user is authenticated.

```ts
function signUp(username: string, password: string) {
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

ForWhen using public keys, the user's device creates a new credential with a pair of public and private key. The private key is securely stored on the user's device, and the public key and the credential id is stored in a database.

On sign in, the user's device verifies the identity of the user (e.g. using their fingerprint). If successful, it creates a new signature with the private key. This signature can be verified using the user's public key, which can be referenced with the credential id.

```ts
function signUp(username: string) {
	const passkeyCredential = createPasskey(username);
	createUser({
		credentialId: passkeyCredential.id,
		publicKey: passkeyCredential.publicKey
	});
}

function signIn() {
	const passkeyCredential = getPasskey();
	const user = getUserByCredentialId(passkeyCredential.id);
	const validCredential = verifySignature(
		passkeyCredential.signature,
		user.publicKey
	);
	if (!validCredential) throw new Error("Invalid passkey");
}
```

## Sign up user

Before creating a passkey, we need to check if the username is taken on the server. We don't want to store redundant passkeys on the user's device. We'll also generate a challenge and store it. We'll send this back to the client, and it be sent with the passkey credential to prevent replay attacks.

```ts
const userExists = !!getUserByUsername(username);
if (userExists) throw new Error("Username already used");
// recommend minimum 16 bytes
const challenge = crypto.getRandomValues(new Uint8Array(32));
```

On the client, we'll call `navigator.credentials.create()` to create a new passkey publicKeyCredential. Some explanations:

- `rp.name`: Relying party name - your application's name
- `user.id`: Something unique to the user - no personal info (usernames, emails, etc)
- `user.name`: Something unique to the user (username, email, etc)
- `pubKeyCredParams`: Algorithm to use

I'm still not really sure why `user.id` is necessary since it never comes up again. We'll be use algorithm `-7`, or ECDSA with the secp256k1 curve and the SHA-256 (aka. ES256K).

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
				// based on IANA COSE Algorithms registry id
				alg: -7
			}
		],
		challenge
	}
});
if (!(publicKeyCredential instanceof PublicKeyCredential)) {
	throw new TypeError();
}
```

This returns a `PublicKeyCredential`, which should be sent to the server for verification. However, I'm going to verify it on the browser and store the credential on local storage.

### Verifying attestation

I don't really see the benefit of verifying most of these aside from the challenge, but I'll try to follow the specification. I'll be skipping 2 verifications:

1. Attestation origin: I don't really care who or what kind of device created the credential
2. `signCount`: This is for detecting cloned authenticators, but isn't applicable to passkeys since it can be generated by multiple devices

```ts
const response = publicKeyCredential.response;
if (!(response instanceof AuthenticatorAttestationResponse)) {
	throw new TypeError();
}

const clientData = JSON.parse(utf8Decode(response.clientDataJSON)) as {
	type: string;
	challenge: string; // base64url encoded challenge
	origin: string; // url origin
};
if (clientData.type !== "webauthn.create") {
	throw new Error("Failed to verify attestation");
}
if (clientData.challenge !== encodeBase64Url(options.challenge)) {
	throw new Error("Failed to verify attestation");
}
if (clientData.origin !== window.location.origin) {
	throw new Error("Failed to verify attestation");
}

// bytes 0-31: relying party id hash (SHA-256)
// byte 32: flags (stored in binary)
// bytes 33 ~ 36: signCount - ignore for passkeys (always 0?)
// minimum 37 bytes (for passkeys always 37?)
const authData = new Uint8Array(response.getAuthenticatorData());
const rpIdHash = authData.slice(0, 32);
// relying party id is set to hostname by default
const rpIdData = new TextEncoder().encode(window.location.hostname);
const expectedRpIdHash = await crypto.subtle.digest("SHA-256", rpIdData);
if (!bytesEquals(rpIdHash, expectedRpIdHash)) {
	throw new Error("Failed to verify attestation");
}
if (authData.byteLength < 37) throw new Error();
const flagsByte = authData.at(32) ?? null;
if (flagsByte === null) {
	throw new Error("Failed to verify attestation");
}
// convert into binary
const flagsBits = flagsByte.toString(2);
// check if user present flag (least significant bit) is 1
if (flagsBits.charAt(flagsBits.length - 1) !== "1") {
	throw new Error("Failed to verify attestation");
}
```

```ts
function bytesEquals(
	buffer1: ArrayBuffer | Uint8Array,
	buffer2: ArrayBuffer | Uint8Array
) {
	const bytes1 = new Uint8Array(buffer1);
	const bytes2 = new Uint8Array(buffer2);
	if (bytes1.byteLength !== bytes2.byteLength) return false;
	for (let i = 0; i < bytes1.byteLength; i++) {
		if (bytes1[i] !== bytes2[i]) return false;
	}
	return true;
}
```

#### 1. Verify client data

First, we're going to verify the properties of `clientData`, which can be retrieved by JSON parsing the utf decode of `clientDataJSON`.

- `type`: Should be `"webauthn.create"`
- `challenge`: Should be equal to the base64url encoded challenge you generated you used
- `origin`: Should be your application origin (e.g. `http://localhost:3000`)

#### 2. Verify replying party id

The relying party id is the hostname of your application by default (e.g. `http://example.com:3000` => `example.com`). The hash of it can be created with the Web Crypto API. The attestation also includes the hash of it inside the first 32 bytes of `authData`. This hash should match the expected hash generated by you.

#### 3. Check for user present flag

The 33rd byte of `authData` is where the flags are stored as a binary. Get the least significant bit (most right side) and check if it's equal to 1 (user is present).

### Store credentials

If the verification passes, store the credential id (already base64url encoded) and the public key (base64url encoded).

```ts
const userId = generateId(8);
insertUser({
	id: userId,
	credential_id: publicKeyCredential.id,
	username,
	public_key: encodeBase64Url(publicKey)
});
```

## Authenticate user

Again, we'll generate a challenge and storing it on the server, and send it to the client. This time, we'll use `navigator.credentials.get()`. This will prompt the user to pick an account (if they have multiple) and verifies their identity. If successful, it will again return a `PublicKeyCredential`.

```ts
const publicKeyCredential = await navigator.credentials.get({
	publicKey: {
		challenge
	}
});
if (!(publicKeyCredential instanceof PublicKeyCredential)) {
	throw new Error("Failed to verify assertion");
}
```

### Verifying Assertion

This is where we verify the signature with the assigned algorithm. If you recall, it was ES256K.

Before doing that, we have to do a similar verification process as the attestation. Again, I don't really see the benefit of doing these.

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
	throw new Error("Failed to verify assertion");
}
if (clientData.challenge !== encodeBase64Url(options.challenge)) {
	throw new Error("Failed to verify assertion");
}
if (clientData.origin !== window.location.origin) {
	throw new Error("Failed to verify assertion");
}

const authData = new Uint8Array(response.authenticatorData);
const rpIdHash = authData.slice(0, 32);
const rpIdData = new TextEncoder().encode(window.location.hostname);
const expectedRpIdHash = await crypto.subtle.digest("SHA-256", rpIdData);
if (!bytesEquals(rpIdHash, expectedRpIdHash)) {
	throw new Error("Failed to verify assertion");
}
const flagsByte = new Uint8Array(authData).at(32) ?? null;
if (flagsByte === null) {
	throw new Error("Failed to verify assertion");
}
const flagsBits = flagsByte.toString(2);
if (flagsBits.charAt(flagsBits.length - 1) !== "1") {
	throw new Error("Failed to verify assertion");
}

const hash = await crypto.subtle.digest("SHA-256", response.clientDataJSON);
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
	// the signature is encoded in DER
	// so we need to convert into ECDSA compatible format
	convertDERSignatureToECDSASignature(response.signature),
	concatenateBuffer(authData, hash)
);
if (!verifiedSignature) {
	throw new Error("Failed to verify assertion");
}
```

### Create the message

### Extract the signature

This is where I was stuck for like 3 hours. You'd expect that you'll be able to use the signature from the assertion as is. But nope.

The signature is in the "Distinguished Encoding Rules" (DER) format. This stores the data like below, with a length of around 70 bytes.

```
1 byte: `48` (header byte)
1 byte: total byte length - header byte length (1)
1 byte: `2` (header byte indicating an integer)
1 byte: r value byte length
around 32 bytes: r value
1 byte: `2` (header byte indicating an integer)
1 byte: s value byte length
around 32 bytes: s value
```

We need to extract the `r` and `s` value, both of which are 32 bytes unsigned integer, and concatenate them for it to be in the format ECDSA expects.

```
SEQUENCE:
r value (32 bytes)
s value (32 bytes)
```

In code, it'd look like this:

```ts
function convertDERSignatureToECDSASignature(
	DERSignature: ArrayLike<number> | ArrayBufferLike
): ArrayBuffer {
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

But... integers in DER format can be smaller or larger (with leading 0s) than the expected size (in this case 32 bytes)! So we need handle those cases and transform them into 32 bytes.

```ts
function decodeDERInteger(
	integerBytes: Uint8Array,
	expectedLength: number
): Uint8Array {
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

Finally, after all those verification and transformation, we can verify the signature. The data we'll verify over is the concatenation of the `authData` and the hash of `clientDataJSON`.

```ts
const hash = await crypto.subtle.digest("SHA-256", response.clientDataJSON);
const data = concatenateBuffer(authData, hash);
```

Since the public key is also DER encoded, we'll import it by defining the format as `spki` (fun fact: it's pronounced _spooky_). If the credential is valid, `verify()` will return `true`.

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
	// the signature is encoded in DER
	// so we need to convert into ECDSA compatible format
	convertDERSignatureToECDSASignature(response.signature),
	data
);
if (!verifiedSignature) {
	throw new Error("Failed to verify assertion");
}
```

## Final thoughts

## Useful functions

```ts
function encodeBase64(data: ArrayLike<number> | ArrayBufferLike) {
	return btoa(String.fromCharCode(...new Uint8Array(data)));
}

function encodeBase64Url(data: ArrayLike<number> | ArrayBufferLike) {
	return encodeBase64(data)
		.replaceAll("=", "")
		.replaceAll("+", "-")
		.replaceAll("/", "_");
}

function decodeBase64Url(data: string) {
	return decodeBase64(data.replaceAll("-", "+").replaceAll("_", "/"));
}

function decodeBase64(data: string) {
	return Uint8Array.from(atob(data).split(""), (x) => x.charCodeAt(0));
}

function utf8Decode(buffer: BufferSource) {
	const textDecoder = new TextDecoder();
	return textDecoder.decode(buffer);
}
```

```ts
function bytesEquals(
	buffer1: ArrayBuffer | Uint8Array,
	buffer2: ArrayBuffer | Uint8Array
) {
	const bytes1 = new Uint8Array(buffer1);
	const bytes2 = new Uint8Array(buffer2);
	if (bytes1.byteLength !== bytes2.byteLength) return false;
	for (let i = 0; i < bytes1.byteLength; i++) {
		if (bytes1[i] !== bytes2[i]) return false;
	}
	return true;
}

function concatenateBuffer(buffer1: ArrayBuffer, buffer2: ArrayBuffer) {
	return concatenateUint8Array(new Uint8Array(buffer1), new Uint8Array(buffer2))
		.buffer;
}

function concatenateUint8Array(bytes1: Uint8Array, bytes2: Uint8Array) {
	const result = new Uint8Array(bytes1.byteLength + bytes2.byteLength);
	result.set(new Uint8Array(bytes1), 0);
	result.set(new Uint8Array(bytes2), bytes1.byteLength);
	return result;
}
```
