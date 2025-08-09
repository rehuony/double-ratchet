export default function FriendListCard({
	uuid,
	username,
	avatar_url,
	is_selected,
	latest_message,
	handleSelectCard,
}: InterfaceFriendListCard) {
	return (
		<div
			onClick={() => handleSelectCard(uuid)}
			className={
				"flex items-center p-2 gap-2 border-b-1 cursor-pointer " +
				"hover:bg-gray-100 " +
				(is_selected && "bg-gray-200")
			}>
			<img
				src={avatar_url}
				alt={`${username}'s avatar`}
				className="flex-none w-12 h-12 rounded-full select-none"
			/>
			<div className="grow flex flex-col gap-1 overflow-hidden">
				<div className="font-bold select-none">{username}</div>
				<div className="pr-4 truncate text-sm text-gray-500 select-none">
					{latest_message || "Chat with him..."}
				</div>
			</div>
		</div>
	);
}
