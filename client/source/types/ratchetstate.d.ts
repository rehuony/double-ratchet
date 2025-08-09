type RatchetType = "sender" | "receiver" | undefined;

interface InterfaceDerivationRecord {
	baseKey: string;
	saltKey?: string;
	outputKey: string;
	messageKey: string;
}

interface InterfaceUserKeyChain {
	type: RatchetType;
	public_key: CryptoKey;
	private_key: CryptoKey;
	rootchain: Array<InterfaceDerivationRecord>;
	sendchain: Array<Array<InterfaceDerivationRecord>>;
	recvchain: Array<Array<InterfaceDerivationRecord>>;
}
