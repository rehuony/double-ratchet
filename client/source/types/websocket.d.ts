type FrameType =
	| MessageType
	| "event_confirm" // 事件：确认接收到了数据
	| "event_addfriend" // 事件：接收到了好友请求
	| "event_denyfriend" // 事件：好友请求被拒绝
	| "event_allowfriend" // 事件：好友请求被接受
	| "change_keychain" // Sender -> Server：请求更新与某用户的棘轮状态
	| "change_publickey" // Sender -> Receiver：请求更新与某用户的DH公钥
	| "update_userlist" // Server -> Receiver: 服务器向用户端推送当前的用户列表
	| "update_friendlist"; // Server -> Receiver: 服务器向用户推送最新的好友列表

interface InterfaceWSFrame {
	id: number;
	type: FrameType;
	sender: string;
	receiver: string;
	data: string;
}

interface InterfaceWSMessage {
	type: MessageType;
	data: string;
	sender: string;
	receiver: string;
}

interface InterfaceWSTextData {
	content: string;
	content_iv: string;
	x_ratchet: number;
	y_ratchet: number;
	timestamp: number;
}

interface InterfaceWSExchangeKeyDate {
	base_public_key: string;
	base_private_iv: string;
	base_private_key: string;
	salt_public_key: string;
	salt_private_iv: string;
	salt_private_key: string;
}

interface InterfaceWSUserlistData {
	uuid: string;
	username: string;
	avatar_url: string;
	public_key: string;
}

interface InterfaceWSFriendlistData {
	uuid: string;
	username: string;
	avatar_url: string;
	public_key: string;
	chain_iv: string;
	chain_key: string;
	messages: Array<InterfaceWSMessage>;
}

interface InterfaceWSSignatureData {
	data: string;
	signature: string;
}

interface InterfaceWSChainKeyData {
	chain_iv: string;
	chain_key: string;
}
