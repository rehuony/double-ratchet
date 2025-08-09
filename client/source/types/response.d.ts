interface InterfaceBaseResponse {
	code: number;
	message: string;
}

// Api Response Interface: /api/auth/valid
interface InterfaceAuthValidResponse extends InterfaceBaseResponse {}

// Api Response Interface: /api/auth/forgot
interface InterfaceAuthForgotResponse extends InterfaceBaseResponse {}

// Api Response Interface: /api/auth/login
interface InterfaceAuthLoginResponse extends InterfaceBaseResponse {
	data: InterfaceAuthLoginData;
}

interface InterfaceAuthLoginData {
	uuid: string;
	username: string;
	avatar_url: string;
	public_key: string;
	private_iv: string;
	private_key: string;
	authorization: string;
}

// Api Response Interface: /api/auth/register
interface InterfaceAuthRegisterResponse extends InterfaceBaseResponse {}