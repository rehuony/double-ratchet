import axios from "axios";
import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";

import { CONFIG_BASE_URL, CONFIG_ROOT_PATH, CONFIG_USER_ITEM } from "../config/config";
import { showNoticeCard } from "../utils/toaster";

export default function AuthPage() {
	const navigate = useNavigate();

	useEffect(() => {
		const validate = async () => {
			const userInforString = localStorage.getItem(CONFIG_USER_ITEM);

			if (!userInforString) {
				navigate(`${CONFIG_ROOT_PATH}/auth/login`);
				return;
			}

			const userInfor = JSON.parse(userInforString) as InterfaceStorageUserInfor;

			const { data } = await axios.post<InterfaceAuthValidResponse>(
				`${CONFIG_BASE_URL}/api/auth/valid`,
				{
					uuid: userInfor.uuid,
					username: userInfor.username,
					authorization: userInfor.authorization,
				} as InterfaceAuthValidRequest
			);

			if (data.code !== 200) throw new Error(data.message);

			navigate(`${CONFIG_ROOT_PATH}/user/chat`);
		};

		const timer = setTimeout(async () => {
			try {
				await validate();
			} catch (error) {
				localStorage.clear();
				navigate(`${CONFIG_ROOT_PATH}/auth/login`);
				if (axios.isAxiosError(error)) {
					await showNoticeCard(
						"❌",
						"Validate Error",
						`${error.message}: ${
							error.response?.data?.message ??
							"An unknown fatal error seems to have occurred..."
						}`
					);
				} else {
					console.log(error);
				}
			}
		}, 0);

		return () => clearTimeout(timer);
	}, []);

	return <Outlet />;
}
