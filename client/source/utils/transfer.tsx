export function latinToArrayBuffer(str: string): ArrayBuffer {
	const buffer = new ArrayBuffer(str.length);
	const buferView = new Uint8Array(buffer);
	for (let i = 0, strLen = str.length; i < strLen; i++) {
		buferView[i] = str.charCodeAt(i);
	}
	return buffer;
}

export function arrayBufferToLatin(buffer: ArrayBuffer): string {
	const bufferView = new Uint8Array(buffer);
	return Array.from(bufferView, item => String.fromCharCode(item)).join("");
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	return latinToArrayBuffer(atob(base64));
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	return btoa(arrayBufferToLatin(buffer));
}

export function stringToArrayBuffer(str: string): ArrayBuffer {
	const encoder = new TextEncoder();
	return encoder.encode(str).buffer;
}

export function arrayBufferToString(buffer: ArrayBuffer): string {
	const decoder = new TextDecoder();
	return decoder.decode(buffer);
}

export function arrayBufferToHexString(buffer: ArrayBuffer): string {
	let hexDigest: string;
	return new Uint8Array(buffer).reduce((prev: string, curr: number) => {
		hexDigest = curr.toString(16);
		hexDigest = hexDigest.length === 2 ? hexDigest : "0" + hexDigest;
		return prev + hexDigest;
	}, "");
}

export function hexStringToArrayBuffer(hex: string): ArrayBuffer {
	if (hex.length % 2 !== 0) {
		throw new Error("Invalid hex string");
	}
	const buffer = new ArrayBuffer(hex.length / 2);
	const bufferView = new Uint8Array(buffer);
	for (let i = 0; i < hex.length; i += 2) {
		bufferView[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return buffer;
}
