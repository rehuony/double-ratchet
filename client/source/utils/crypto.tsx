import {
	arrayBufferToBase64,
	base64ToArrayBuffer,
	stringToArrayBuffer,
} from "./transfer";

const ECDHKeyParams = {
	name: "ECDH",
	namedCurve: "P-256",
};

const ECDSAKeyParams = {
	name: "ECDSA",
	namedCurve: "P-521",
};

export async function generateECDHKeyPair() {
	return window.crypto.subtle.generateKey(ECDHKeyParams, true, [
		"deriveKey",
		"deriveBits",
	]);
}

export async function generateECDSAKeyPair() {
	return window.crypto.subtle.generateKey(ECDSAKeyParams, true, ["sign", "verify"]);
}

export async function exportECKeyToRaw(publickey: CryptoKey) {
	return window.crypto.subtle.exportKey("raw", publickey);
}

export async function importRawToECDHKey(publickey: ArrayBuffer) {
	return window.crypto.subtle.importKey("raw", publickey, ECDHKeyParams, true, []);
}

export async function importRawToECDSAKey(publickey: ArrayBuffer) {
	return window.crypto.subtle.importKey("raw", publickey, ECDSAKeyParams, true, [
		"verify",
	]);
}

export async function exportECKeyToPem(key: CryptoKey, isPrivate?: boolean) {
	const pemType = isPrivate ? "pkcs8" : "spki";
	const pemHead = isPrivate ? "PRIVATE" : "PUBLIC";
	const keyBuffer = await window.crypto.subtle.exportKey(pemType, key);
	const base64Str = arrayBufferToBase64(keyBuffer);
	const formatted = base64Str.match(/.{1,64}/g)?.join("\n");
	return `-----BEGIN ${pemHead} KEY-----\n${formatted}\n-----END ${pemHead} KEY-----`;
}

export async function importPemToECDHKey(pem: string, isPrivate?: boolean) {
	const pemType = isPrivate ? "pkcs8" : "spki";
	const pemHead = isPrivate ? "PRIVATE" : "PUBLIC";
	const pemHeader = `-----BEGIN ${pemHead} KEY-----`;
	const pemFooter = `-----END ${pemHead} KEY-----`;
	const pemContents = pem
		.replace(pemHeader, "")
		.replace(pemFooter, "")
		.replace(/\s+/g, "");

	const binaryPemBuffer = base64ToArrayBuffer(pemContents);

	return window.crypto.subtle.importKey(
		pemType,
		binaryPemBuffer,
		ECDHKeyParams,
		true,
		isPrivate ? ["deriveKey", "deriveBits"] : []
	);
}

export async function importPemToECDSAKey(pem: string, isPrivate?: boolean) {
	const pemType = isPrivate ? "pkcs8" : "spki";
	const pemHead = isPrivate ? "PRIVATE" : "PUBLIC";
	const pemHeader = `-----BEGIN ${pemHead} KEY-----`;
	const pemFooter = `-----END ${pemHead} KEY-----`;
	const pemContents = pem
		.replace(pemHeader, "")
		.replace(pemFooter, "")
		.replace(/\s+/g, "");

	const binaryPemBuffer = base64ToArrayBuffer(pemContents);

	return window.crypto.subtle.importKey(
		pemType,
		binaryPemBuffer,
		ECDSAKeyParams,
		true,
		isPrivate ? ["sign"] : ["verify"]
	);
}

export async function signMessageWithSha256(privatekey: CryptoKey, message: ArrayBuffer) {
	return window.crypto.subtle.sign(
		{
			name: "ECDSA",
			hash: "SHA-256",
		},
		privatekey,
		message
	);
}

export async function verifyMessageWithSha256(
	publickey: CryptoKey,
	signature: ArrayBuffer,
	message: ArrayBuffer
) {
	return window.crypto.subtle.verify(
		{
			name: "ECDSA",
			hash: "SHA-256",
		},
		publickey,
		signature,
		message
	);
}

export async function calcSecretKey(username: string, password: string) {
	const usernameBuffer = stringToArrayBuffer(username);
	const passwordBuffer = stringToArrayBuffer(password);
	const derivedKeyBuffer = await deriveChainKey(usernameBuffer, passwordBuffer);
	return derivedKeyBuffer.leftKey;
}

export async function calcSha256Digest(message: string) {
	return window.crypto.subtle.digest("SHA-256", stringToArrayBuffer(message));
}

export async function calcSharedSecret(privatekey: CryptoKey, publickey: CryptoKey) {
	return window.crypto.subtle.deriveBits(
		{
			name: "ECDH",
			public: publickey,
		},
		privatekey,
		32 * 8 // NOTE: ECDH - P-256 - Maximum allowed is 256 bits
	);
}

export async function deriveChainKey(key: ArrayBuffer, salt: ArrayBuffer) {
	const baseKey = await window.crypto.subtle.importKey("raw", key, "HKDF", false, [
		"deriveBits",
	]);

	const derivedBits = await window.crypto.subtle.deriveBits(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: salt,
			info: new ArrayBuffer(),
		},
		baseKey,
		2 * 32 * 8 // NOTE: Double numbers for DH shared secret
	);

	const leftKey = derivedBits.slice(0, derivedBits.byteLength / 2);
	const rightKey = derivedBits.slice(derivedBits.byteLength / 2);

	return { leftKey, rightKey };
}

export async function encryptWithAESGCM(key: ArrayBuffer, plaintext: ArrayBuffer) {
	const iv = crypto.getRandomValues(new Uint8Array(16));
	const baseKey = await window.crypto.subtle.importKey("raw", key, "AES-GCM", false, [
		"encrypt",
		"decrypt",
	]);
	const ciphertext = await crypto.subtle.encrypt(
		{
			iv: iv,
			name: "AES-GCM",
		},
		baseKey,
		plaintext
	);
	return { iv: iv.buffer, ciphertext };
}

export async function decryptWithAESGCM(
	key: ArrayBuffer,
	iv: ArrayBuffer,
	ciphertext: ArrayBuffer
) {
	const baseKey = await window.crypto.subtle.importKey("raw", key, "AES-GCM", false, [
		"encrypt",
		"decrypt",
	]);
	const plaintext = await crypto.subtle.decrypt(
		{
			iv: iv,
			name: "AES-GCM",
		},
		baseKey,
		ciphertext
	);
	return plaintext;
}
