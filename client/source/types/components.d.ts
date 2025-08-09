interface InterfaceFormInputWithIcon {
	type: HTMLInputTypeAttribute;
	name: string;
	value: string;
	children: JSX.Element;
	placeholder: string;
	handleChange: React.Dispatch<React.SetStateAction<string>>;
}

interface InterfaceFriendListCard {
	uuid: string;
	username: string;
	avatar_url: string;
	is_selected: boolean;
	latest_message: string;
	handleSelectCard: React.Dispatch<React.SetStateAction<string>>;
}

interface InterfaceLazyUnderlineLink {
	text: string;
	link: string;
}

interface InterfaceUploadFileContainer {
	accept: string;
	dragtext: string;
	hovertext: string;
	defaulttext: string;
	selectedFile: File | null;
	handleSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
}
