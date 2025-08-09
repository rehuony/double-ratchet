import axios from "axios";
import { CircleUserRound, LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { useEffect, useState } from "react";

import FormInputWithIcon from "../components/FormInputWithIcon";
import LazyUnderlineLink from "../components/LazyUnderlineLink";

import { VITE_BASE_URL } from "../config/config";
import { checkPassword, checkUsername } from "../utils/check";
import {
	calcSecretKey,
	calcSha256Digest,
	encryptWithAESGCM,
	exportECKeyToPem,
	generateECDSAKeyPair,
} from "../utils/crypto";
import { showNoticeCard } from "../utils/toaster";
import {
	arrayBufferToBase64,
	arrayBufferToHexString,
	stringToArrayBuffer,
} from "../utils/transfer";

export default function RegisterPage() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [publicKey, setPublicKey] = useState("");
	const [privateKey, setPrivateKey] = useState("");
	const [isShowPassword, setIsShowPassword] = useState(false);
	const [isShowDownload, setIsShowDownload] = useState(false);

	useEffect(() => {
		const generateKeyPair = async () => {
			const ecdsaKeyPair = await generateECDSAKeyPair();
			const publicPem = await exportECKeyToPem(ecdsaKeyPair.publicKey);
			const privatePem = await exportECKeyToPem(ecdsaKeyPair.privateKey, true);

			setPublicKey(publicPem);
			setPrivateKey(privatePem);
		};

		generateKeyPair();
	}, []);

	const handleSubmit = async (event: React.MouseEvent) => {
		event.preventDefault();

		if (checkUsername(username)) {
			await showNoticeCard("❌", "Username Error", checkUsername(username)!);
			return;
		} else if (checkPassword(password)) {
			await showNoticeCard("❌", "Password Error", checkPassword(password)!);
			return;
		}

		const publivKeyBase64 = btoa(publicKey);

		const { iv, ciphertext } = await encryptWithAESGCM(
			await calcSecretKey(username, password),
			stringToArrayBuffer(privateKey)
		);
		const privateIVBase64 = arrayBufferToBase64(iv);
		const PrivateKeyBase64 = arrayBufferToBase64(ciphertext);

		const passwordDigest = arrayBufferToHexString(await calcSha256Digest(password));

		try {
			const { data } = await axios.post<InterfaceAuthRegisterResponse>(
				`${VITE_BASE_URL}/api/auth/register`,
				{
					username: username,
					password: passwordDigest,
					public_key: publivKeyBase64,
					private_iv: privateIVBase64,
					private_key: PrivateKeyBase64,
				} as InterfaceAuthRegisterRequest
			);

			if (data.code !== 200) throw new Error(data.message);

			setIsShowDownload(true);
			await showNoticeCard("🎉", "Register Success", data.message);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				await showNoticeCard(
					"❌",
					"Register Error",
					`${error.message}: ${
						error.response?.data?.message ??
						"An unknown fatal error seems to have occurred..."
					}`
				);
			} else {
				console.log(error);
			}
		}
	};

	return isShowDownload ? (
		<div className="absolute flex flex-col items-center top-1/2 left-1/2 -translate-1/2 w-1/3 p-4 gap-4 rounded-xl shadow-xl bg-white border border-gray-200">
			<h2 className="text-3xl font-bold text-center text-green-700 select-none">
				🎉 Register Success
			</h2>
			<p className="text-gray-700 text-center select-none">
				Please download and properly save your private key file, this is the only
				way to restore your identity
			</p>
			<div className="flex justify-between items-center w-full text-left gap-2">
				<p className="text-md font-semibold text-gray-500 select-none">
					Private FileName:{" "}
				</p>
				<p className="grow text-md font-mono bg-gray-100 p-1 rounded-md select-none">
					{`${username}_private_key.pem`}
				</p>
			</div>
			<button
				onClick={() => {
					const blob = new Blob([privateKey], {
						type: "text/plain;charset=utf-8",
					});
					const url = URL.createObjectURL(blob);
					const link = document.createElement("a");
					link.href = url;
					link.download = `${username}_private_key.pem`;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					URL.revokeObjectURL(url);
				}}
				className="px-6 py-2 rounded-xl text-lg font-medium active:scale-92 duration-100 bg-green-600 hover:bg-green-700 text-white cursor-pointer select-none">
				Download
			</button>
			<LazyUnderlineLink text="Return to HomePage" link="/auth/login" />
		</div>
	) : (
		<div className="absolute top-1/2 left-1/2 -translate-1/2 w-100 p-4">
			<h2 className="m-4 text-4xl font-bold text-center select-none">Register</h2>
			<form
				onSubmit={event => event.preventDefault}
				className="flex flex-col gap-y-6">
				<FormInputWithIcon
					type="text"
					name="username"
					value={username}
					placeholder="Name"
					handleChange={value => setUsername(value)}>
					<CircleUserRound className="stroke-[1.2] scale-120" />
				</FormInputWithIcon>
				<FormInputWithIcon
					type={isShowPassword ? "text" : "password"}
					name="password"
					value={password}
					placeholder="Password"
					handleChange={value => setPassword(value)}>
					{isShowPassword ? (
						<LockKeyholeOpen
							className="stroke-[1.2] scale-120"
							onClick={() => setIsShowPassword(false)}
						/>
					) : (
						<LockKeyhole
							className="stroke-[1.2] scale-120"
							onClick={() => setIsShowPassword(true)}
						/>
					)}
				</FormInputWithIcon>
				<button
					type="submit"
					onClick={handleSubmit}
					className="self-center w-80 p-2 text-xl rounded-xl cursor-pointer select-none bg-neutral-200">
					Submit
				</button>
				<div className="flex items-center justify-center gap-x-2">
					<p className="select-none">Already have an account?</p>
					<LazyUnderlineLink text="Login" link="/auth/login" />
				</div>
			</form>
		</div>
	);
}
