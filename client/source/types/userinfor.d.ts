interface InterfaceUserInfor {
	uuid: string;
	username: string;
	avatar_url: string;
	secret_key: ArrayBuffer;
	public_key: CryptoKey;
	private_key: CryptoKey;
	authorization: string;
}

interface InterfaceStorageUserInfor {
	uuid: string;
	username: string;
	avatar_url: string;
	secret_key: string;
	public_key: string;
	private_iv: string;
	private_key: string;
	authorization: string;
}
