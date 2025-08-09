type MessageType = "text"

interface InterfaceFriendInfor {
	uuid: string;
	username: string;
	avatar_url: string;
	public_key: CryptoKey;
	messages: Array<InterfaceMessage>;
}

interface InterfaceMessage {
	type: MessageType;
	sender: string;
	receiver: string;
	content: string;
	timestamp: number;
}
