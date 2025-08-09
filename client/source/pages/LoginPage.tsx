import axios from "axios";
import { CircleUserRound, LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import FormInputWithIcon from "../components/FormInputWithIcon";
import LazyUnderlineLink from "../components/LazyUnderlineLink";

import { VITE_BASE_URL, VITE_USER_INFOR } from "../config/config";
import { checkPassword, checkUsername } from "../utils/check";
import { calcSecretKey, calcSha256Digest } from "../utils/crypto";
import { showNoticeCard } from "../utils/toaster";
import { arrayBufferToHexString } from "../utils/transfer";

export default function LoginPage() {
	const navigate = useNavigate();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [remember, setRemember] = useState(false);
	const [isShowPassword, setIsShowPassword] = useState(false);

	const handleSubmit = async (event: React.MouseEvent) => {
		event.preventDefault();

		if (checkUsername(username)) {
			showNoticeCard("❌", "Username Error", checkUsername(username)!);
			return;
		} else if (checkPassword(password)) {
			showNoticeCard("❌", "Password Error", checkPassword(password)!);
			return;
		}

		const secretDigest = arrayBufferToHexString(
			await calcSecretKey(username, password)
		);

		const passwordDigest = arrayBufferToHexString(await calcSha256Digest(password));

		try {
			const { data } = await axios.post<InterfaceAuthLoginResponse>(
				`${VITE_BASE_URL}/api/auth/login`,
				{
					username: username,
					password: passwordDigest,
					remember: remember,
				} as InterfaceAuthLoginRequest
			);

			if (data.code !== 200) throw new Error(data.message);

			navigate("/user/chat");
			localStorage.setItem(
				VITE_USER_INFOR,
				JSON.stringify({
					...data.data,
					secret_key: secretDigest,
				} as InterfaceStorageUserInfor)
			);
			await showNoticeCard("🎉", "Login Success", data.message);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				await showNoticeCard(
					"❌",
					"Login Error",
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
			<h2 className="m-4 text-4xl font-bold text-center select-none">Login</h2>
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
				<div className="flex items-center justify-between">
					<div className="flex items-center justify-center gap-x-1">
						<input
							type="checkbox"
							name="remember"
							id="remember"
							checked={remember}
							onChange={event => setRemember(event.target.checked)}
							className="accent-blue-300"
						/>
						<label htmlFor="remember" className="select-none">
							Remember
						</label>
					</div>
					<div>
						<LazyUnderlineLink text="Forgot Password?" link="/auth/forgot" />
					</div>
				</div>
				<button
					type="submit"
					onClick={handleSubmit}
					className={
						"self-center w-80 p-2 text-xl rounded-xl " +
						"cursor-pointer select-none duration-300 " +
						"bg-neutral-200 hover:bg-blue-200 disabled:hover:bg-neutral-200"
					}>
					Submit
				</button>
				<div className="flex items-center justify-center gap-x-2">
					<p className="select-none">Don't have an account?</p>
					<LazyUnderlineLink text="Register" link="/auth/register" />
				</div>
			</form>
		</div>
	);
}
