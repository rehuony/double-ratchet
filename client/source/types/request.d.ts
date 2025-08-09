// Api Request Interface: /api/auth/valid
interface InterfaceAuthValidRequest {
	uuid: string; //  UUID v4
	username: string;
	authorization: string;
}

// Api Request Interface: /api/auth/forgot
interface InterfaceAuthForgotRequest {
	username: string;
	password: string; // Sha256(plain_password)
	signinfo: string; // Base64(sign(username, sha256(username:timestamp)))
	timestamp: string;
	private_iv: string; // Base64(IV)
	private_key: string; // Base64(Encrypt(ESDSA-P521-PrivKey-Pem, calcSecretKey(username, plain_password), IV))
}

// Api Request Interface: /api/auth/login
interface InterfaceAuthLoginRequest {
	remember: boolean;
	username: string;
	password: string;
}

// Api Request Interface: /api/auth/register
interface InterfaceAuthRegisterRequest {
	username: string;
	password: string;
	public_key: string; // Base64(ESDSA-P521-PubKey-Pem)
	private_iv: string;
	private_key: string;
}
