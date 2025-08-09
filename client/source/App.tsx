import { useState } from "react";
import { createBrowserRouter, redirect, RouterProvider } from "react-router";
// Import routing pages
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import ErrorPage from "./pages/ErrorPage";
import ForgotPage from "./pages/ForgotPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
// Import user infomation context
import { UserInforContext } from "./context/UserInforContext";

// Define page router for react application
const router = createBrowserRouter([
	{ index: true, loader: () => redirect("/auth/login") },
	{
		path: "/auth",
		element: <AuthPage />,
		children: [
			{ path: "login", element: <LoginPage /> },
			{ path: "forgot", element: <ForgotPage /> },
			{ path: "register", element: <RegisterPage /> },
		],
	},
	{
		path: "/user",
		element: <AuthPage />,
		children: [{ path: "chat", element: <ChatPage /> }],
	},
	{ path: "*", element: <ErrorPage /> },
]);

export default function App() {
	const [userInfor, setUserInfor] = useState<InterfaceUserInfor | null>(null);

	return (
		<UserInforContext.Provider value={{ userInfor, setUserInfor }}>
			<RouterProvider router={router} />
		</UserInforContext.Provider>
	);
}
