import { createContext } from "react";

interface InterfaceUserInforContext {
	userInfor: InterfaceUserInfor | null;
	setUserInfor: React.Dispatch<React.SetStateAction<InterfaceUserInfor | null>>;
}

export const UserInforContext = createContext<InterfaceUserInforContext>({
	userInfor: null,
	setUserInfor: () => {},
});
