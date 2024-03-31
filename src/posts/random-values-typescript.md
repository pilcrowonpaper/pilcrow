---
title: "Generating random values in TypeScript"
description: "Generate cryptographically strong random values with the Web Crypto API."
date: "2024-1-3"
---

`Math.random()` is broken. Nobody expected JavaScript to be anything more than just a language to add some tiny interactions to websites. So, what's the alternative?

There's Node's `crypto` API, but there's also the lesser known Web Crypto API. It provides basic APIs for cryptography, including hashing, encryption, and generating random values. It's a web API so it's available everywhere as well, including Node.js, browsers, Deno, Bun, and Cloudflare Workers. `Crypto.getRandomValues()` looks like the API we want.

The issue though is that `getRandomValues()` takes a `TypedArray`, such as `Uint8Array` (commonly used to represent a sequence of bytes). This means the smallest range you can generate is 0 to 255 (1 byte). So, how do you generate a number between 1 and 10 or an alphanumeric ID?

```ts
const bytes = new Uint8Array(20); // 20 bytes
crypto.getRandomValues(bytes);
console.log(bytes); // 20 random bytes
```

## Generating random integers

One common approach is to use the modulo operator on a random number. We can get a random number, divide it with `max`, and use the remainder as the result.

```ts
// generates a random integer between 0 (inclusive) and `max` (exclusive)
function generateRandomInteger(max: number) {
	const bytes = new Uint8Array(1);
	crypto.getRandomValues(uint32Sequence);
	return bytes[0] % max;
}
```

This however introduces the "modulo bias," which causes some values to occur more often than others. For example, if the largest possible number was 5, and the `max` was 2, `0` appears 3/5 times (0, 2, 4) while `1` appears 2/5 times (1, 3). We can use a much larger number (e.g. `Uint32Array` instead of `Uint8Array`), the bias will still be there.

Another common approach is to multiply `max` with a random float and then removing the mantissa. This seems to fix the modulo problem...or does it?

```ts
function generateRandomInteger(max: number): number {
	// assume `random()` is a cryptographically secure `Math.random()`
	return Math.floor(random() * max);
}
```

If `random()` can only generate 5 numbers (0, 0.2, 0.4, 0.6, 0.8), `0` appears 3/5 times (0, 0.4, 0.8) and 2/5 times (1.2, 1.6). So it still has the same problem.

These biases might be fine for certain applications, but you definitely want to avoid it when dealing with anything cryptography. So, how do you generate a random integer without introducing any bias? Brute force. Just keep generating random values until it's within the desired range.

```ts
function generateRandomInteger(max: number): number {
	const bytes = new Uint8Array(1);
	crypto.getRandomValues(bytes);
	if (bytes[0] < max) {
		return bytes[0];
	}
	return generateRandomInteger(max);
}
```

This of course isn't very useful or efficient. We can improve on it to get something like this:

```ts
function generateRandomInteger(max: number): number {
	if (max < 0 || !Number.isInteger(max)) {
		throw new Error("Argument 'max' must be an integer greater than or equal to 0");
	}
	const bitLength = (max - 1).toString(2).length;
	const shift = bitLength % 8;
	const bytes = new Uint8Array(Math.ceil(bitLength / 8));

	crypto.getRandomValues(bytes);

	// This zeroes bits that can be ignored to increase the chance `result` < `max`.
	// For example, if `max` can be represented with 10 bits, the leading 6 bits of the random 16 bits (2 bytes) can be ignored.
	if (shift !== 0) {
		bytes[0] &= (1 << shift) - 1;
	}
	let result = bytesToInteger(bytes);
	while (result > max - 1) {
		crypto.getRandomValues(bytes);
		if (shift !== 0) {
			bytes[0] &= (1 << shift) - 1;
		}
		result = bytesToInteger(bytes);
	}
	return result;
}

function bytesToInteger(bytes: Uint8Array): number {
	const binary = Array.from(bytes)
		.map((byte) => byte.toString(2).padStart(8, "0"))
		.join();
	return parseInt(binary, 2);
}
```

The basic idea is still the same - we generate a random number, check the range, and continue the process until we find a valid result. But, here we only generate random bytes that'll be used (we don't need 7 bytes when `max` is 100) and remove bits from the generated values that can be safely ignored. This overall reduces the computation required. So what exactly is the code doing? Say we set `max` to 1000:

1. 1000 can be represented with 2 bytes, so we only generate 2 random bytes.
2. We only care about 10 bits since 2^10 - 1 = 1023 > 1000.
3. 2 bytes => 16 bits, so mask 6 (16 - 10) bits we don't need.
4. Repeat 1~3 until we get a valid number.

Step 3 is a bit hard to understand, so let's go step by step:

```ts
bytes[0] &= (1 << shift) - 1;
```

First, `<<` is a bitwise left-shift operator. If we do `<< 3`, bits are moved to 3 bits to the left:

```
00000101
00101000
```

And the `&=` is a bitwise AND assignment:

```
    0101
AND 1001
--------
    0001
```

Let's say `max` is 1000 and the random data we generated was `11010010_00110100`. `shift` is then 2, so we shift `1` to the left 2 times:

```
00000001
00000100
```

We then subtract 1 from `00000100`, which makes it `00000011`. Now if we do an AND assignment to the first byte of the random value:

```
    11010010
AND 00000011
------------
    00000010
```

We effectively zeroed the first 6 bits! This means the random value will always be less than `1024`, increasing the chance of them being under `1000`. Just wanted this share since I thought the bitwise operations were pretty cool.

## Generate random strings

This is pretty straightforward. There are mainly 2 ways to achieve this:

1. Generate random bytes and encode it.
2. Pick a random character N times and combine them.

For option 1, we can just use base64 or hex encoding:

```ts
const bytes = new Uint8Array(20);
crypto.getRandomValues(bytes);

const id = encodeBase64(bytes); // consider using base64url too
const id = encodeHex(bytes);

function encodeBase64(data: Uint8Array): string {
	return btoa(String.fromCharCode(...data));
}

function encodeHex(data: Uint8Array): string {
	let result = "";
	for (let i = 0; i < data.length; i++) {
		result += data[i]!.toString(16).padStart(2, "0");
	}
	return result;
}
```

For option 2, we can use the random number generator we built in the previous section:

```ts
function generateRandomString(length: number, alphabet: string): string {
	let result = "";
	for (let i = 0; i < length; i++) {
		result += alphabet[generateRandomInteger(alphabet.length)];
	}
	return result;
}

const id = generateRandomString(20, "0123456789abcdefghijklmnopqrstuvwxyz");
```

## Cryptographically strong `Math.random()`

Let's just say you really need a random float between 0 and 1. You need a cryptographically strong `Math.random()`. The most simple method is to generate a random 32 bit number and divide it by the largest possible number (2^32-1) + 1.

```ts
function random(): number {
	const randomUint32Values = new Uint32Array(1);
	crypto.getRandomValues(randomUint32Values);
	const u32Max = 0xffffffff; // max uint32 value
	// convert uint32 to floating point between 0 (inclusive) and 1 (exclusive)
	// divide by max + 1 to exclude 1
	return randomUint32Values[0]! / (u32Max + 1);
}
```

But, we only get 32 bits of random. `Math.random()` can provide much more than that - so let's get 52 bits. Here, we're effectively generating a random float64, which is 8 bytes. We're then modifying the float to be within 1 and 2, and subtracting 1 from it.

```ts
function random(): number {
	const buffer = new ArrayBuffer(8);
	const bytes = crypto.getRandomValues(new Uint8Array(buffer));

	// sets the exponent value (11 bits) to 01111111111 (1023)
	// since the bias is 1023 (2 * (11 - 1) - 1), 1023 - 1023 = 0
	// 2^0 * (1 + [52 bit number between 0-1]) = number between 1-2
	bytes[0] = 63;
	bytes[1] |= 240;

	return new DataView(buffer).getFloat64(0) - 1;
}
```

How does this work? A floating point number is made of 3 parts (bit length is for float64):

- Sign `S` (1 bit): + or -
- Exponent `E` (11 bits)
- Fraction `F` (52 bits): Number between 0 and 1

The number it represents can be calculated with:

```ts
// 11 because the exponent is 11 bits
const bias = 2 ** (11 - 1) - 1; // 1023
const biasedExponent = E - bias;
const num = (-1) ** S * 2 ** biasedExponent * (1 + F);
```

The goal is to extract `F` as is. Since we want a positive number, `S` should be 0, and if `biasedExponent` is 0, we just get a number between 1 and 2! So that means we need to set `bias` to 1023. In other words, we need the first 12 bits to be `0_01111111111`.

The first byte can just be `00111111`, or 63. The next byte is a bit tricky since we have to preserve bits 5 to 8. Here we can use the bitwise OR assignment:

```
   10010101
OR 11110000 // 240
-----------
   11110101
```

## A suggestion

I maintain an auth utility library called [Oslo](https://github.com/pilcrowonpaper/oslo), which provides everything I mentioned here and more! You might want to check it out :D
