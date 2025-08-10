import axios from "axios";
import { CircleUserRound, LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import FormInputWithIcon from "../components/FormInputWithIcon";
import LazyUnderlineLink from "../components/LazyUnderlineLink";
import UploadFileContainer from "../components/UploadFileContainer";

import { CONFIG_BASE_URL, CONFIG_ROOT_PATH } from "../config/config";
import { checkPassword, checkUsername } from "../utils/check";
import {
	calcSecretKey,
	calcSha256Digest,
	encryptWithAESGCM,
	importPemToECDSAKey,
	signMessageWithSha256,
} from "../utils/crypto";
import { showNoticeCard } from "../utils/toaster";
import {
	arrayBufferToBase64,
	arrayBufferToHexString,
	stringToArrayBuffer,
} from "../utils/transfer";

export default function ForgotPage() {
	const navigate = useNavigate();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isShowPassword, setIsShowPassword] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	const handleSubmit = async (event: React.MouseEvent) => {
		event.preventDefault();
		if (checkUsername(username)) {
			await showNoticeCard("❌", "Username Error", checkUsername(username)!);
			return;
		} else if (checkPassword(password)) {
			await showNoticeCard("❌", "Password Error", checkPassword(password)!);
			return;
		} else if (!selectedFile) {
			await showNoticeCard(
				"❌",
				"Selected File Error",
				"Please select your private key file"
			);
			return;
		}

		try {
			const timestamp = String(Date.now());
			const privateKey = await importPemToECDSAKey(await selectedFile.text(), true);
			const signature = await signMessageWithSha256(
				privateKey,
				stringToArrayBuffer(`${username}:${timestamp}`)
			);
			const passwordDigest = arrayBufferToHexString(
				await calcSha256Digest(password)
			);
			const { iv, ciphertext } = await encryptWithAESGCM(
				await calcSecretKey(username, password),
				await selectedFile.arrayBuffer()
			);
			const privateIVBase64 = arrayBufferToBase64(iv);
			const signatureBase64 = arrayBufferToBase64(signature);
			const privateKeyBase64 = arrayBufferToBase64(ciphertext);

			const { data } = await axios.post<InterfaceAuthForgotResponse>(
				`${CONFIG_BASE_URL}/api/auth/forgot`,
				{
					username: username,
					password: passwordDigest,
					signinfo: signatureBase64,
					timestamp: timestamp,
					private_iv: privateIVBase64,
					private_key: privateKeyBase64,
				} as InterfaceAuthForgotRequest
			);

			if (data.code !== 200) throw new Error(data.message);

			navigate(`${CONFIG_ROOT_PATH}/auth/login`);
			await showNoticeCard("🎉", "Change Password Success", data.message);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				await showNoticeCard(
					"❌",
					"Change Password Error",
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

	return (
		<div className="absolute top-1/2 left-1/2 -translate-1/2 w-100 p-4">
			<h2 className="m-4 text-4xl font-bold text-center select-none">Forgot</h2>
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
					placeholder="New Password"
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
				<UploadFileContainer
					accept=".pem"
					dragtext="Drop your key file here"
					hovertext="Click to select your key file"
					defaulttext="Click or drag your key file here"
					selectedFile={selectedFile}
					handleSelectedFile={selectedFile => setSelectedFile(selectedFile)}
				/>
				<button
					type="submit"
					onClick={handleSubmit}
					className="self-center w-80 p-2 text-xl rounded-xl cursor-pointer select-none bg-neutral-200">
					Submit
				</button>
				<div className="flex items-center justify-center gap-x-2">
					<p className="select-none">Remembered your password?</p>
					<LazyUnderlineLink text="Login" link={`${CONFIG_ROOT_PATH}/auth/login`} />
				</div>
			</form>
		</div>
	);
}
