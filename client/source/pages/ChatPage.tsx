import { Send, UserRoundSearch, X } from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";

import FriendListCard from "../components/FriendListCard";

import { VITE_USER_INFOR, VITE_WS_URL } from "../config/config";
import { UserInforContext } from "../context/UserInforContext";
import {
	calcSharedSecret,
	decryptWithAESGCM,
	deriveChainKey,
	encryptWithAESGCM,
	exportECKeyToPem,
	generateECDHKeyPair,
	importPemToECDHKey,
	importPemToECDSAKey,
	signMessageWithSha256,
	verifyMessageWithSha256,
} from "../utils/crypto";
import { showConfirmCard, showNoticeCard } from "../utils/toaster";
import {
	arrayBufferToBase64,
	arrayBufferToHexString,
	arrayBufferToString,
	base64ToArrayBuffer,
	hexStringToArrayBuffer,
	stringToArrayBuffer,
} from "../utils/transfer";

export default function ChatPage() {
	const { userInfor, setUserInfor } = useContext(UserInforContext)!;

	const [isLoaded, setIsLoaded] = useState(false);

	const [searchName, setSearchName] = useState("");
	const [inputMessage, setInputMessage] = useState("");
	const [currentFriendUUID, setCurrentFriendUUID] = useState("");

	const [userList, setUserList] = useState<Array<InterfaceWSUserlistData>>([]);
	const userListRef = useRef(userList);

	const [friendList, setFriendList] = useState<Array<InterfaceFriendInfor>>([]);
	const friendListRef = useRef(friendList);

	const socketRef = useRef<WebSocket | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const ratchetChainRef = useRef<Record<string, InterfaceUserKeyChain>>({});

	const filteredUserList =
		searchName.trim() === ""
			? []
			: userList.filter(user =>
					user.username.toLowerCase().includes(searchName.toLowerCase().trim())
			  );
	const isSearching = searchName.trim() !== "";
	const hasSearchResults = filteredUserList.length > 0;
	const currentFriend = friendList.find(friend => friend.uuid === currentFriendUUID);

	useEffect(() => {
		userListRef.current = userList;
	}, [userList]);

	useEffect(() => {
		friendListRef.current = friendList;
	}, [friendList]);

	useEffect(() => {
		const initinalUserInfor = async () => {
			const localStorageData = localStorage.getItem(VITE_USER_INFOR);
			if (!localStorageData) return;
			const storageUserInfor = JSON.parse(
				localStorageData
			) as InterfaceStorageUserInfor;

			const publicPem = atob(storageUserInfor.public_key);
			const privatePem = arrayBufferToString(
				await decryptWithAESGCM(
					hexStringToArrayBuffer(storageUserInfor.secret_key),
					base64ToArrayBuffer(storageUserInfor.private_iv),
					base64ToArrayBuffer(storageUserInfor.private_key)
				)
			);

			setUserInfor({
				uuid: storageUserInfor.uuid,
				username: storageUserInfor.username,
				avatar_url: storageUserInfor.avatar_url,
				secret_key: hexStringToArrayBuffer(storageUserInfor.secret_key),
				public_key: await importPemToECDSAKey(publicPem),
				private_key: await importPemToECDSAKey(privatePem, true),
				authorization: storageUserInfor.authorization,
			});

			setIsLoaded(true);
		};

		initinalUserInfor();
	}, []);

	useEffect(() => {
		if (!isLoaded || !userInfor) return;
		let reconnectTimer: NodeJS.Timeout | undefined = undefined;

		const connectWebSocket = () => {
			const socket = new WebSocket(
				`${VITE_WS_URL}/api/websocket?token=${userInfor.authorization}`
			);

			socket.onopen = () => {
				if (reconnectTimer) {
					clearTimeout(reconnectTimer);
					reconnectTimer = undefined;
				}
				console.log("📃WebSocket: connected to server...");
			};

			socket.onerror = () => {
				socket.close();
				console.log("📃WebSocket: connection happens error...");
			};

			socket.onclose = event => {
				if (event.code !== 1000) {
					reconnectTimer = setTimeout(connectWebSocket, 3000);
					console.log("📃WebSocket: reconnect after 3 seconds...");
				}
				console.log(`📃WebSocket: connection is closed - code: ${event.code}`);
			};

			socket.onmessage = async event => {
				const frame = JSON.parse(event.data) as InterfaceWSFrame;

				const ackMessage: InterfaceWSFrame = {
					id: frame.id,
					type: "event_confirm",
					sender: frame.receiver,
					receiver: frame.sender,
					data: "",
				};
				socket.send(JSON.stringify(ackMessage));

				switch (frame.type) {
					case "text":
						await handleRecvMessage(frame.data, frame.sender);
						break;
					case "event_addfriend":
						await handleEventAddFriend(frame.data, frame.sender);
						break;
					case "event_denyfriend":
						await handleEventDenyFriend(frame.data, frame.sender);
						break;
					case "event_allowfriend":
						await handleEventAllowFriend(frame.data, frame.sender);
						break;
					case "change_publickey":
						await handleChangePublickey(frame.data, frame.sender);
						break;
					case "update_userlist":
						await handleUpdateUserlist(frame.data);
						break;
					case "update_friendlist":
						await handleUpdateFriendList(frame.data);
						break;
					default:
						console.log("📃WebSocket: unknown frame type: ", frame.type);
				}
			};

			socketRef.current = socket;
		};

		const timer = setTimeout(() => {
			try {
				connectWebSocket();
				showNoticeCard("🎉", "Success", "Connected to the WebSocket Server");
			} catch (error) {
				showNoticeCard("❌", "Error", `Failed to connect websocket server`);
			}
		}, 0);

		return () => {
			if (socketRef.current) {
				socketRef.current.close(1000);
				socketRef.current = null;
			}
			clearTimeout(timer);
			clearTimeout(reconnectTimer);
			reconnectTimer = undefined;
		};
	}, [isLoaded, userInfor]);

	const handleCloseChatWindow = () => {
		if (currentFriendUUID && inputMessage.trim()) {
			localStorage.setItem(`message_${currentFriendUUID}`, inputMessage);
		}

		setCurrentFriendUUID("");
		setInputMessage("");
	};

	const handleSelectFriend = (uuid: string) => {
		if (currentFriendUUID && inputMessage.trim()) {
			localStorage.setItem(`message_${currentFriendUUID}`, inputMessage);
		}

		setCurrentFriendUUID(uuid);

		setTimeout(() => {
			const cachedMessage = localStorage.getItem(`message_${uuid}`);
			if (cachedMessage) {
				setInputMessage(cachedMessage);
				localStorage.removeItem(`message_${uuid}`);
			} else {
				setInputMessage("");
			}
		}, 0);
	};

	const handleAddFriend = async (uuid: string) => {
		if (!socketRef.current || !isLoaded || !userInfor) return;

		const baseKeyPair = await generateECDHKeyPair();
		const saltKeyPair = await generateECDHKeyPair();
		const basePublicPemBase64 = btoa(await exportECKeyToPem(baseKeyPair.publicKey));
		const saltPublicPemBase64 = btoa(await exportECKeyToPem(saltKeyPair.publicKey));
		const { iv: basePrivatePemIV, ciphertext: basePrivatePemCipher } =
			await encryptWithAESGCM(
				userInfor.secret_key,
				stringToArrayBuffer(await exportECKeyToPem(baseKeyPair.privateKey, true))
			);
		const { iv: saltPrivatePemIV, ciphertext: saltPrivatePemCipher } =
			await encryptWithAESGCM(
				userInfor.secret_key,
				stringToArrayBuffer(await exportECKeyToPem(saltKeyPair.privateKey, true))
			);

		const addFriendContent = JSON.stringify({
			base_public_key: basePublicPemBase64,
			base_private_iv: arrayBufferToBase64(basePrivatePemIV),
			base_private_key: arrayBufferToBase64(basePrivatePemCipher),
			salt_public_key: saltPublicPemBase64,
			salt_private_iv: arrayBufferToBase64(saltPrivatePemIV),
			salt_private_key: arrayBufferToBase64(saltPrivatePemCipher),
		} as InterfaceWSExchangeKeyDate);

		const signature = await signMessageWithSha256(
			userInfor.private_key,
			stringToArrayBuffer(addFriendContent)
		);

		setSearchName("");
		socketRef.current.send(
			JSON.stringify({
				id: 0,
				type: "event_addfriend",
				sender: userInfor.uuid,
				receiver: uuid,
				data: JSON.stringify({
					signature: arrayBufferToHexString(signature),
					data: addFriendContent,
				} as InterfaceWSSignatureData),
			} as InterfaceWSFrame)
		);
		showNoticeCard(
			"😉",
			"Success",
			"A friend request has been sent to the other party"
		);
	};

	const handleEventAddFriend = async (data: string, senderUUID: string) => {
		if (!socketRef.current || !isLoaded || !userInfor) return;

		const senderUser = userListRef.current.find(user => user.uuid === senderUUID);
		if (!senderUser) {
			socketRef.current.send(
				JSON.stringify({
					id: 0,
					type: "update_userlist",
					sender: userInfor.uuid,
					receiver: userInfor.uuid,
					data: data,
				} as InterfaceWSFrame)
			);
			socketRef.current.send(
				JSON.stringify({
					id: 0,
					type: "event_denyfriend",
					sender: userInfor.uuid,
					receiver: senderUUID,
					data: "",
				} as InterfaceWSFrame)
			);
			return;
		}
		const signatureData = JSON.parse(data) as InterfaceWSSignatureData;

		const isVerified = await verifyMessageWithSha256(
			await importPemToECDSAKey(atob(senderUser.public_key)),
			hexStringToArrayBuffer(signatureData.signature),
			stringToArrayBuffer(signatureData.data)
		);

		if (!isVerified) {
			showNoticeCard(
				"❌",
				"Signature Error",
				"The sent data signature verification failed"
			);
			return;
		}

		const accepted = await showConfirmCard(
			"🤝 New friend request",
			`${senderUser.username} requested to add you as a friend. Accept?`
		);

		if (!accepted) {
			socketRef.current.send(
				JSON.stringify({
					id: 0,
					type: "event_denyfriend",
					sender: userInfor.uuid,
					receiver: senderUUID,
					data: "",
				} as InterfaceWSFrame)
			);
			return;
		}

		const exchangeKeyData = JSON.parse(
			signatureData.data
		) as InterfaceWSExchangeKeyDate;

		const remoteBasePub = await importPemToECDHKey(
			atob(exchangeKeyData.base_public_key)
		);
		const remoteSaltPub = await importPemToECDHKey(
			atob(exchangeKeyData.salt_public_key)
		);

		const localBaseKey = await generateECDHKeyPair();
		const localSaltKey = await generateECDHKeyPair();

		const content: InterfaceWSExchangeKeyDate = {
			base_public_key: btoa(await exportECKeyToPem(localBaseKey.publicKey)),
			base_private_iv: exchangeKeyData.base_private_iv,
			base_private_key: exchangeKeyData.base_private_key,
			salt_public_key: btoa(await exportECKeyToPem(localSaltKey.publicKey)),
			salt_private_iv: exchangeKeyData.salt_private_iv,
			salt_private_key: exchangeKeyData.salt_private_key,
		};

		const addFriendContent = JSON.stringify(content);
		const signature = await signMessageWithSha256(
			userInfor.private_key,
			stringToArrayBuffer(addFriendContent)
		);

		socketRef.current.send(
			JSON.stringify({
				id: 0,
				type: "event_allowfriend",
				sender: userInfor.uuid,
				receiver: senderUUID,
				data: JSON.stringify({
					signature: arrayBufferToHexString(signature),
					data: addFriendContent,
				} as InterfaceWSSignatureData),
			} as InterfaceWSFrame)
		);

		setFriendList([
			...friendListRef.current,
			{
				uuid: senderUser.uuid,
				username: senderUser.username,
				avatar_url: senderUser.avatar_url,
				public_key: await importPemToECDSAKey(atob(senderUser.public_key)),
				messages: [],
			},
		]);

		const baseSecret = await calcSharedSecret(localBaseKey.privateKey, remoteBasePub);
		const saltSecret = await calcSharedSecret(localSaltKey.privateKey, remoteSaltPub);
		const derived = await deriveChainKey(baseSecret, saltSecret);

		ratchetChainRef.current[senderUUID] = {
			type: undefined,
			public_key: remoteSaltPub,
			private_key: localSaltKey.privateKey,
			rootchain: [
				{
					baseKey: arrayBufferToHexString(baseSecret),
					saltKey: arrayBufferToHexString(saltSecret),
					outputKey: arrayBufferToHexString(derived.leftKey),
					messageKey: arrayBufferToHexString(derived.rightKey),
				},
			],
			sendchain: [],
			recvchain: [],
		};

		await handleChangeKeyChain(senderUUID);
	};

	const handleEventDenyFriend = async (data: string, senderUUID: string) => {
		if (!socketRef.current || !isLoaded || !userInfor) return;

		const senderUser = userListRef.current.find(user => user.uuid === senderUUID);
		if (!senderUser) {
			socketRef.current.send(
				JSON.stringify({
					id: 0,
					type: "update_userlist",
					sender: userInfor.uuid,
					receiver: userInfor.uuid,
					data: data, // 没有用处，只是看起来格式好看
				} as InterfaceWSFrame)
			);
			return;
		}

		showNoticeCard(
			"😢",
			"Sorry",
			`${senderUser.username} rejected your friend request`
		);
	};

	const handleEventAllowFriend = async (data: string, senderUUID: string) => {
		if (!socketRef.current || !isLoaded || !userInfor) return;

		const senderUser = userListRef.current.find(user => user.uuid === senderUUID);
		if (!senderUser) {
			socketRef.current.send(
				JSON.stringify({
					id: 0,
					type: "update_userlist",
					sender: userInfor.uuid,
					receiver: userInfor.uuid,
					data: data, // 没有用处，只是看起来格式好看
				} as InterfaceWSFrame)
			);
			return;
		}
		const signatureData = JSON.parse(data) as InterfaceWSSignatureData;

		const isVerified = await verifyMessageWithSha256(
			await importPemToECDSAKey(atob(senderUser.public_key)),
			hexStringToArrayBuffer(signatureData.signature),
			stringToArrayBuffer(signatureData.data)
		);

		if (!isVerified) {
			showNoticeCard(
				"❌",
				"Signature Error",
				"The sent data signature verification failed"
			);
			return;
		}

		showNoticeCard(
			"😉",
			"Yeah!",
			`${senderUser.username} accept your friend's request`
		);

		setFriendList([
			...friendListRef.current,
			{
				uuid: senderUser.uuid,
				username: senderUser.username,
				avatar_url: senderUser.avatar_url,
				public_key: await importPemToECDSAKey(atob(senderUser.public_key)),
				messages: [],
			},
		]);

		const exchangeKeyData = JSON.parse(
			signatureData.data
		) as InterfaceWSExchangeKeyDate;

		const remoteBasePub = await importPemToECDHKey(
			atob(exchangeKeyData.base_public_key)
		);
		const remoteSaltPub = await importPemToECDHKey(
			atob(exchangeKeyData.salt_public_key)
		);

		const localBasePriv = await importPemToECDHKey(
			arrayBufferToString(
				await decryptWithAESGCM(
					userInfor.secret_key,
					base64ToArrayBuffer(exchangeKeyData.base_private_iv),
					base64ToArrayBuffer(exchangeKeyData.base_private_key)
				)
			),
			true
		);

		const localSaltPriv = await importPemToECDHKey(
			arrayBufferToString(
				await decryptWithAESGCM(
					userInfor.secret_key,
					base64ToArrayBuffer(exchangeKeyData.salt_private_iv),
					base64ToArrayBuffer(exchangeKeyData.salt_private_key)
				)
			),
			true
		);

		const baseSecret = await calcSharedSecret(localBasePriv, remoteBasePub);
		const saltSecret = await calcSharedSecret(localSaltPriv, remoteSaltPub);
		const derived = await deriveChainKey(baseSecret, saltSecret);

		ratchetChainRef.current[senderUUID] = {
			type: undefined,
			public_key: remoteSaltPub,
			private_key: localSaltPriv,
			rootchain: [
				{
					baseKey: arrayBufferToHexString(baseSecret),
					saltKey: arrayBufferToHexString(saltSecret),
					outputKey: arrayBufferToHexString(derived.leftKey),
					messageKey: arrayBufferToHexString(derived.rightKey),
				},
			],
			sendchain: [],
			recvchain: [],
		};

		await handleChangeKeyChain(senderUUID);
	};

	const handleChangeKeyChain = async (senderUUID: string) => {
		if (!socketRef.current || !isLoaded || !userInfor) return;

		const { iv: chainIV, ciphertext: chainKey } = await encryptWithAESGCM(
			userInfor.secret_key,
			stringToArrayBuffer(
				JSON.stringify({
					...ratchetChainRef.current[senderUUID],
					public_key: btoa(
						await exportECKeyToPem(
							ratchetChainRef.current[senderUUID].public_key
						)
					),
					private_key: btoa(
						await exportECKeyToPem(
							ratchetChainRef.current[senderUUID].private_key,
							true
						)
					),
				})
			)
		);

		socketRef.current.send(
			JSON.stringify({
				id: 0,
				type: "change_keychain",
				sender: userInfor.uuid,
				receiver: senderUUID,
				data: JSON.stringify({
					chain_iv: arrayBufferToBase64(chainIV),
					chain_key: arrayBufferToBase64(chainKey),
				} as InterfaceWSChainKeyData),
			} as InterfaceWSFrame)
		);
	};

	const handleChangePublickey = async (data: string, senderUUID: string) => {
		if (!socketRef.current || !isLoaded || !userInfor) return;

		const senderUser = userListRef.current.find(user => user.uuid === senderUUID);
		if (!senderUser) {
			socketRef.current.send(
				JSON.stringify({
					id: 0,
					type: "update_userlist",
					sender: userInfor.uuid,
					receiver: userInfor.uuid,
					data: data, // 没有用处，只是看起来格式好看
				} as InterfaceWSFrame)
			);
			return;
		}
		const signatureData = JSON.parse(data) as InterfaceWSSignatureData;

		const isVerified = await verifyMessageWithSha256(
			await importPemToECDSAKey(atob(senderUser.public_key)),
			hexStringToArrayBuffer(signatureData.signature),
			stringToArrayBuffer(signatureData.data)
		);

		if (!isVerified) {
			showNoticeCard(
				"❌",
				"Signature Error",
				"The sent data signature verification failed"
			);
			return;
		}

		ratchetChainRef.current[senderUUID] = {
			...ratchetChainRef.current[senderUUID],
			public_key: await importPemToECDHKey(atob(signatureData.data)),
		};
	};

	const handleUpdateUserlist = async (data: string) => {
		if (!isLoaded || !userInfor) return;
		setUserList(JSON.parse(data) as Array<InterfaceWSUserlistData>);
		console.log("😉Update: fetch userlist success");
	};

	const handleUpdateFriendList = async (data: string) => {
		if (!isLoaded || !userInfor) return;
		const friendListArray = JSON.parse(data) as Array<InterfaceWSFriendlistData>;

		const parsedFriends: Array<InterfaceFriendInfor> = [];
		const ratchetChains: Record<string, InterfaceUserKeyChain> = {};

		for (const friend of friendListArray) {
			if (!friend.chain_iv || !friend.chain_key) {
				parsedFriends.push({
					uuid: friend.uuid,
					username: friend.username,
					avatar_url: friend.avatar_url,
					public_key: await importPemToECDSAKey(atob(friend.public_key)),
					messages: [],
				});
				break;
			}

			const oldFriend = friendListRef.current.find(f => f.uuid === friend.uuid);
			const oldMessages = oldFriend?.messages ?? [];

			const keyChainBuffer = await decryptWithAESGCM(
				userInfor.secret_key,
				base64ToArrayBuffer(friend.chain_iv),
				base64ToArrayBuffer(friend.chain_key)
			);
			const keyChain = JSON.parse(
				arrayBufferToString(keyChainBuffer)
			) as InterfaceUserKeyChain & { public_key: string; private_key: string };

			const friendKeyChain = {
				...keyChain,
				public_key: await importPemToECDHKey(atob(keyChain.public_key)),
				private_key: await importPemToECDHKey(atob(keyChain.private_key), true),
			};

			const friendMessages: InterfaceMessage[] = [];

			for (const msg of friend.messages) {
				// TODO: 目前仅有文本信息，以后有文件再完善
				if (msg.type != "text") return;

				const record = JSON.parse(msg.data) as InterfaceWSTextData;
				const msgKeyChain =
					msg.sender === userInfor.uuid
						? friendKeyChain.sendchain
						: friendKeyChain.recvchain;

				while (!msgKeyChain[record.x_ratchet][record.y_ratchet]?.messageKey) {
					const yIndex = msgKeyChain[record.x_ratchet].length - 1;

					const { leftKey, rightKey } = await deriveChainKey(
						hexStringToArrayBuffer(
							msgKeyChain[record.x_ratchet][yIndex].baseKey
						),
						new ArrayBuffer()
					);

					msgKeyChain[record.x_ratchet][yIndex].outputKey =
						arrayBufferToHexString(leftKey);
					msgKeyChain[record.x_ratchet][yIndex].messageKey =
						arrayBufferToHexString(rightKey);
					msgKeyChain[record.x_ratchet].push({
						baseKey: arrayBufferToHexString(leftKey),
						outputKey: "",
						messageKey: "",
					});
				}

				const plainText = arrayBufferToString(
					await decryptWithAESGCM(
						hexStringToArrayBuffer(
							msgKeyChain[record.x_ratchet][record.y_ratchet].messageKey
						),
						base64ToArrayBuffer(record.content_iv),
						base64ToArrayBuffer(record.content)
					)
				);

				friendMessages.push({
					type: msg.type,
					sender: msg.sender,
					receiver: msg.receiver,
					content: plainText,
					timestamp: record.timestamp,
				});
			}

			const combinedMessages = [...friendMessages, ...oldMessages];
			const seen = new Set<string>();
			const deduplicatedMessages = combinedMessages.filter(msg => {
				const key = `${msg.sender}-${msg.timestamp}`;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
			// 这里使最新的消息在最前面
			deduplicatedMessages.sort((a, b) => b.timestamp - a.timestamp);

			parsedFriends.push({
				uuid: friend.uuid,
				username: friend.username,
				avatar_url: friend.avatar_url,
				public_key: await importPemToECDSAKey(atob(friend.public_key)),
				messages: deduplicatedMessages,
			});

			ratchetChains[friend.uuid] = friendKeyChain;
		}

		ratchetChainRef.current = ratchetChains;

		setFriendList(parsedFriends);
		console.log("😉Update: fetch friendlist success");
	};

	const handleSendMessage = async () => {
		if (!socketRef.current || !isLoaded || !userInfor) return;
		const ratchetState = ratchetChainRef.current[currentFriendUUID];

		if (!ratchetState.type) {
			ratchetState.type = "sender";
			ratchetState.sendchain.push([
				{
					baseKey: ratchetState.rootchain.at(-1)!.messageKey,
					outputKey: "",
					messageKey: "",
				},
			]);
		}

		if (ratchetState.type === "sender") {
			if (ratchetState.sendchain.length === ratchetState.recvchain.length) {
				const sharedSecret = await calcSharedSecret(
					ratchetState.private_key,
					ratchetState.public_key
				);

				const derivedKey = await deriveChainKey(
					hexStringToArrayBuffer(ratchetState.rootchain.at(-1)!.outputKey),
					sharedSecret
				);

				ratchetState.rootchain.push({
					baseKey: ratchetState.rootchain.at(-1)!.outputKey,
					saltKey: arrayBufferToHexString(sharedSecret),
					outputKey: arrayBufferToHexString(derivedKey.leftKey),
					messageKey: arrayBufferToHexString(derivedKey.rightKey),
				});

				ratchetState.sendchain.push([
					{
						baseKey: ratchetState.rootchain.at(-1)!.messageKey,
						outputKey: "",
						messageKey: "",
					},
				]);
			}

			const xIndex = ratchetState.sendchain.length - 1;
			const yIndex = ratchetState.sendchain[xIndex].length - 1;

			const { leftKey, rightKey } = await deriveChainKey(
				hexStringToArrayBuffer(ratchetState.sendchain[xIndex][yIndex].baseKey),
				new ArrayBuffer()
			);

			ratchetState.sendchain[xIndex][yIndex].outputKey =
				arrayBufferToHexString(leftKey);
			ratchetState.sendchain[xIndex][yIndex].messageKey =
				arrayBufferToHexString(rightKey);
			ratchetState.sendchain[xIndex].push({
				baseKey: arrayBufferToHexString(leftKey),
				outputKey: "",
				messageKey: "",
			});

			const { iv, ciphertext } = await encryptWithAESGCM(
				rightKey,
				stringToArrayBuffer(inputMessage)
			);

			socketRef.current.send(
				JSON.stringify({
					id: 0,
					type: "text",
					sender: userInfor.uuid,
					receiver: currentFriendUUID,
					data: JSON.stringify({
						content: arrayBufferToBase64(ciphertext),
						content_iv: arrayBufferToBase64(iv),
						x_ratchet: xIndex,
						y_ratchet: yIndex,
						timestamp: Date.now(),
					} as InterfaceWSTextData),
				} as InterfaceWSFrame)
			);
		} else {
			if (ratchetState.sendchain.length !== ratchetState.recvchain.length) {
				const ecdhKeyPair = await generateECDHKeyPair();

				ratchetState.private_key = ecdhKeyPair.privateKey;

				const pubPemBase64 = btoa(await exportECKeyToPem(ecdhKeyPair.publicKey));
				const signature = await signMessageWithSha256(
					userInfor.private_key,
					stringToArrayBuffer(pubPemBase64)
				);

				socketRef.current.send(
					JSON.stringify({
						id: 0,
						type: "change_publickey",
						sender: userInfor.uuid,
						receiver: currentFriendUUID,
						data: JSON.stringify({
							signature: arrayBufferToHexString(signature),
							data: pubPemBase64,
						} as InterfaceWSSignatureData),
					} as InterfaceWSFrame)
				);

				// BUG: 手动延时操作，后续更改为信息收发确认机制
				await new Promise(resolve => setTimeout(resolve, 100));

				const sharedSecret = await calcSharedSecret(
					ecdhKeyPair.privateKey,
					ratchetState.public_key
				);

				const derivedKey = await deriveChainKey(
					hexStringToArrayBuffer(ratchetState.rootchain.at(-1)!.outputKey),
					sharedSecret
				);

				ratchetState.rootchain.push({
					baseKey: ratchetState.rootchain.at(-1)!.outputKey,
					saltKey: arrayBufferToHexString(sharedSecret),
					outputKey: arrayBufferToHexString(derivedKey.leftKey),
					messageKey: arrayBufferToHexString(derivedKey.rightKey),
				});

				ratchetState.sendchain.push([
					{
						baseKey: arrayBufferToHexString(derivedKey.rightKey),
						outputKey: "",
						messageKey: "",
					},
				]);
			}
			const xIndex = ratchetState.sendchain.length - 1;
			const yIndex = ratchetState.sendchain[xIndex].length - 1;

			const { leftKey, rightKey } = await deriveChainKey(
				hexStringToArrayBuffer(ratchetState.sendchain[xIndex][yIndex].baseKey),
				new ArrayBuffer()
			);

			ratchetState.sendchain[xIndex][yIndex].outputKey =
				arrayBufferToHexString(leftKey);
			ratchetState.sendchain[xIndex][yIndex].messageKey =
				arrayBufferToHexString(rightKey);
			ratchetState.sendchain[xIndex].push({
				baseKey: arrayBufferToHexString(leftKey),
				outputKey: "",
				messageKey: "",
			});

			const { iv, ciphertext } = await encryptWithAESGCM(
				rightKey,
				stringToArrayBuffer(inputMessage)
			);

			socketRef.current.send(
				JSON.stringify({
					id: 0,
					type: "text",
					sender: userInfor.uuid,
					receiver: currentFriendUUID,
					data: JSON.stringify({
						content: arrayBufferToBase64(ciphertext),
						content_iv: arrayBufferToBase64(iv),
						x_ratchet: xIndex,
						y_ratchet: yIndex,
						timestamp: Date.now(),
					} as InterfaceWSTextData),
				} as InterfaceWSFrame)
			);
		}

		setFriendList(prevFriendList =>
			prevFriendList.map(friend =>
				friend.uuid === currentFriendUUID
					? {
							...friend,
							messages: [
								{
									type: "text",
									sender: userInfor.uuid,
									receiver: currentFriendUUID,
									content: inputMessage,
									timestamp: Date.now(),
								},
								...friend.messages,
							],
					  }
					: friend
			)
		);

		setInputMessage("");
		await handleChangeKeyChain(currentFriendUUID);
	};

	const handleRecvMessage = async (data: string, senderUUID: string) => {
		if (!socketRef.current || !isLoaded || !userInfor) return;
		const record = JSON.parse(data) as InterfaceWSTextData;
		const ratchetState = ratchetChainRef.current[senderUUID];

		const senderUser = userListRef.current.find(user => user.uuid === senderUUID);
		if (!senderUser) {
			socketRef.current.send(
				JSON.stringify({
					id: 0,
					type: "update_userlist",
					sender: userInfor.uuid,
					receiver: userInfor.uuid,
					data: data, // 没有用处，只是看起来格式好看
				} as InterfaceWSFrame)
			);
			return;
		}

		if (!ratchetState.type) {
			ratchetState.type = "receiver";
			ratchetState.recvchain.push([
				{
					baseKey: ratchetState.rootchain.at(-1)!.messageKey,
					outputKey: "",
					messageKey: "",
				},
			]);
		}

		if (ratchetState.type === "receiver") {
			if (ratchetState.sendchain.length === ratchetState.recvchain.length) {
				const sharedSecret = await calcSharedSecret(
					ratchetState.private_key,
					ratchetState.public_key
				);

				const derivedKey = await deriveChainKey(
					hexStringToArrayBuffer(ratchetState.rootchain.at(-1)!.outputKey),
					sharedSecret
				);

				ratchetState.rootchain.push({
					baseKey: ratchetState.rootchain.at(-1)!.outputKey,
					saltKey: arrayBufferToHexString(sharedSecret),
					outputKey: arrayBufferToHexString(derivedKey.leftKey),
					messageKey: arrayBufferToHexString(derivedKey.rightKey),
				});

				ratchetState.recvchain.push([
					{
						baseKey: ratchetState.rootchain.at(-1)!.messageKey,
						outputKey: "",
						messageKey: "",
					},
				]);
			}

			const xIndex = record.x_ratchet;
			const yIndex = record.y_ratchet;

			while (!ratchetState.recvchain[xIndex][yIndex]?.messageKey) {
				const last = ratchetState.recvchain[xIndex].length - 1;

				const { leftKey, rightKey } = await deriveChainKey(
					hexStringToArrayBuffer(ratchetState.recvchain[xIndex][last].baseKey),
					new ArrayBuffer()
				);

				ratchetState.recvchain[xIndex][last].outputKey =
					arrayBufferToHexString(leftKey);
				ratchetState.recvchain[xIndex][last].messageKey =
					arrayBufferToHexString(rightKey);
				ratchetState.recvchain[xIndex].push({
					baseKey: arrayBufferToHexString(leftKey),
					outputKey: "",
					messageKey: "",
				});
			}
		} else {
			if (ratchetState.sendchain.length !== ratchetState.recvchain.length) {
				console.log("sender, ", await exportECKeyToPem(ratchetState.public_key));
				const sharedSecret = await calcSharedSecret(
					ratchetState.private_key,
					ratchetState.public_key
				);

				const derivedKey = await deriveChainKey(
					hexStringToArrayBuffer(ratchetState.rootchain.at(-1)!.outputKey),
					sharedSecret
				);

				ratchetState.rootchain.push({
					baseKey: ratchetState.rootchain.at(-1)!.outputKey,
					saltKey: arrayBufferToHexString(sharedSecret),
					outputKey: arrayBufferToHexString(derivedKey.leftKey),
					messageKey: arrayBufferToHexString(derivedKey.rightKey),
				});

				ratchetState.recvchain.push([
					{
						baseKey: ratchetState.rootchain.at(-1)!.messageKey,
						outputKey: "",
						messageKey: "",
					},
				]);

				const ecdhKeyPair = await generateECDHKeyPair();

				ratchetState.private_key = ecdhKeyPair.privateKey;

				const pubPemBase64 = btoa(await exportECKeyToPem(ecdhKeyPair.publicKey));
				const signature = await signMessageWithSha256(
					userInfor.private_key,
					stringToArrayBuffer(pubPemBase64)
				);

				socketRef.current.send(
					JSON.stringify({
						id: 0,
						type: "change_publickey",
						sender: userInfor.uuid,
						receiver: senderUUID,
						data: JSON.stringify({
							signature: arrayBufferToHexString(signature),
							data: pubPemBase64,
						} as InterfaceWSSignatureData),
					} as InterfaceWSFrame)
				);
			}

			const xIndex = record.x_ratchet;
			const yIndex = record.y_ratchet;

			while (!ratchetState.recvchain[xIndex][yIndex]?.messageKey) {
				const last = ratchetState.recvchain[xIndex].length - 1;
				const { leftKey, rightKey } = await deriveChainKey(
					hexStringToArrayBuffer(ratchetState.recvchain[xIndex][last].baseKey),
					new ArrayBuffer()
				);
				ratchetState.recvchain[xIndex][last].outputKey =
					arrayBufferToHexString(leftKey);
				ratchetState.recvchain[xIndex][last].messageKey =
					arrayBufferToHexString(rightKey);
				ratchetState.recvchain[xIndex].push({
					baseKey: arrayBufferToHexString(leftKey),
					outputKey: "",
					messageKey: "",
				});
			}
		}

		ratchetChainRef.current[senderUUID] = ratchetState;
		await handleChangeKeyChain(senderUUID);

		const plaintext = arrayBufferToString(
			await decryptWithAESGCM(
				hexStringToArrayBuffer(
					ratchetState.recvchain[record.x_ratchet][record.y_ratchet].messageKey
				),
				base64ToArrayBuffer(record.content_iv),
				base64ToArrayBuffer(record.content)
			)
		);

		setFriendList(prevFriendList =>
			prevFriendList.map(friend =>
				friend.uuid === senderUUID
					? {
							...friend,
							messages: [
								{
									type: "text",
									sender: senderUUID,
									receiver: userInfor.uuid,
									content: plaintext,
									timestamp: Date.now(),
								},
								...friend.messages,
							],
					  }
					: friend
			)
		);
	};

	return isLoaded ? (
		<div className="flex w-full h-full overflow-hidden">
			<aside className="flex flex-col w-1/4 border-r transition-all duration-300">
				<div className="flex justify-between items-center p-2 gap-2 shadow">
					<div className="flex justify-center items-center cursor-pointer">
						<img
							src={userInfor?.avatar_url}
							alt={`${userInfor?.username}'s avatar`}
							className="w-10 h-10 rounded-full select-none"
						/>
					</div>
					<div className="grow flex items-center relative">
						<UserRoundSearch className="absolute left-3 text-gray-400" />
						<input
							type="text"
							value={searchName}
							onChange={event => setSearchName(event.target.value)}
							placeholder="Search Friends..."
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full outline-none focus:ring-1 focus:ring-black transition duration-150"
						/>
					</div>
				</div>

				<div className="grow flex flex-col overflow-y-auto border-b-1 px-2 py-1">
					{isSearching ? (
						hasSearchResults ? (
							filteredUserList.map(user => {
								const isMe = user.uuid === userInfor?.uuid;
								const isFriend = friendListRef.current.some(
									friend => friend.uuid === user.uuid
								);

								return (
									<div
										key={user.uuid}
										className="flex items-center justify-between py-2 border-b border-gray-200">
										<div className="flex items-center gap-2">
											<img
												src={user.avatar_url}
												alt={user.username}
												className="w-8 h-8 rounded-full"
											/>
											<span className="text-sm font-medium">
												{user.username}
											</span>
										</div>
										{isMe ? (
											<button className="text-xs min-w-24 bg-fuchsia-500 hover:bg-fuchsia-600 text-white px-2 py-1 rounded cursor-pointer">
												Personal
											</button>
										) : isFriend ? (
											<button
												onClick={() => {
													setSearchName("");
													handleSelectFriend(user.uuid);
												}}
												className="text-xs min-w-24 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded cursor-pointer">
												Send Message
											</button>
										) : (
											<button
												onClick={() => handleAddFriend(user.uuid)}
												className="text-xs min-w-24 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded cursor-pointer">
												Add Friend
											</button>
										)}
									</div>
								);
							})
						) : (
							<div className="my-auto text-center text-sm text-gray-500 py-6 select-none">
								The user was not found
							</div>
						)
					) : friendList.length > 0 ? (
						friendList.map(friend => (
							<FriendListCard
								key={friend.uuid}
								uuid={friend.uuid}
								username={friend.username}
								avatar_url={friend.avatar_url}
								is_selected={friend.uuid === currentFriendUUID}
								latest_message={friend.messages[0]?.content ?? ""}
								handleSelectCard={() => handleSelectFriend(friend.uuid)}
							/>
						))
					) : (
						<div className="my-auto text-center text text-gray-500 py-6 select-none">
							You don't have friends yet
						</div>
					)}
				</div>
			</aside>

			<main className="grow flex flex-col border-l transition-all duration-300">
				{currentFriend ? (
					<>
						<div className="flex justify-between items-center border-b p-2 gap-2">
							<div className="flex items-center gap-2">
								<img
									src={currentFriend.avatar_url}
									alt={`${currentFriend.username}'s avatar`}
									className="w-10 h-10 rounded-full select-none"
								/>
								<span className="font-bold select-none">
									{currentFriend.username}
								</span>
							</div>
							<div
								onClick={() => handleCloseChatWindow()}
								className="cursor-pointer pr-4 duration-300">
								<X className="w-6 h-6 stroke-[1.5]" />
							</div>
						</div>
						<div className="grow flex flex-col-reverse items-center p-4 gap-4 overflow-y-auto">
							{currentFriend.messages.map(message => {
								return message.sender === currentFriendUUID ? (
									<div
										key={message.timestamp}
										className="self-start flex items-start gap-2">
										<img
											src={currentFriend.avatar_url}
											alt={`${currentFriend.username}'s avatar`}
											className="w-10 h-10 rounded-full select-none"
										/>
										<div className="min-w-10 max-w-120 rounded-md my-auto p-2 text-sm break-all bg-gray-300">
											{message.content}
										</div>
									</div>
								) : (
									<div
										key={message.timestamp}
										className="self-end flex items-start gap-2">
										<div className="min-w-10 max-w-120 rounded-md my-auto p-2 text-sm break-all bg-green-300">
											{message.content}
										</div>
										<img
											src={userInfor?.avatar_url}
											alt={`${userInfor?.username}'s avatar`}
											className="w-10 h-10 rounded-full select-none"
										/>
									</div>
								);
							})}
						</div>
						<div className="flex justify-center items-center p-2 gap-4">
							<textarea
								value={inputMessage}
								onChange={event => {
									setInputMessage(event.target.value);

									if (textareaRef.current) {
										textareaRef.current.style.maxHeight = `${
											5 *
											parseInt(
												getComputedStyle(textareaRef.current)
													.lineHeight
											)
										}px`;
										textareaRef.current.style.height = "auto";
										textareaRef.current.style.overflowY =
											textareaRef.current.scrollHeight >
											parseInt(textareaRef.current.style.maxHeight)
												? "auto"
												: "hidden";

										textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
									}
								}}
								onKeyDown={event => {
									if (event.key === "Enter" && !event.shiftKey) {
										event.preventDefault();
										handleSendMessage();
									}
								}}
								ref={textareaRef}
								placeholder="Type message here..."
								className="w-full resize-none border outline-none rounded-md placeholder:select-none overflow-y-auto"
							/>
							<div className="flex items-center gap-4">
								<button
									onClick={() => handleSendMessage()}
									className="px-2 py-1 cursor-pointer bg-gray-300 rounded-lg">
									<Send className="w-8 h-8 stroke-1" />
								</button>
							</div>
						</div>
					</>
				) : (
					<div className="m-auto text-gray-400 select-none">
						Please select a contact to start chatting
					</div>
				)}
			</main>
		</div>
	) : (
		<div className="flex justify-center items-center w-full h-full overflow-hidden">
			<div className="m-auto text-2xl text-gray-700 select-none">
				User data has not been obtained, please clear the cache and reload page
			</div>
		</div>
	);
}
