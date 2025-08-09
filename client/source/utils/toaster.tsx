import toast from "react-hot-toast";
import { calcSha256Digest } from "./crypto";
import { arrayBufferToHexString } from "./transfer";

export async function showNoticeCard(icon: string, title: string, message: string) {
	const cardId = arrayBufferToHexString(await calcSha256Digest(`${title}:${message}`));

	toast.custom(
		() => (
			<div className="flex flex-col items-center justify-center min-w-xs max-w-sm gap-2 px-4 py-2 shadow-2xl rounded-xl border border-gray-100">
				<h2 className="flex items-center justify-center font-bold text-xl gap-x-1 select-none">
					<span className="animate-slightly-rotated">{icon}</span>
					<span>{title}</span>
				</h2>
				<div className="font-mono text-md leading-8 break-all select-none">
					{message}
				</div>
			</div>
		),
		{
			id: cardId,
			duration: Infinity,
		}
	);

	setTimeout(() => {
		toast.remove(cardId);
	}, 3000);
}

export async function showConfirmCard(title: string, message: string): Promise<boolean> {
	const cardId = arrayBufferToHexString(await calcSha256Digest(`${title}:${message}`));

	return new Promise(resolve => {
		toast.custom(
			t => (
				<div className="flex flex-col items-center justify-center min-w-xs max-w-sm gap-2 px-8 py-2 shadow-2xl rounded-xl border border-gray-100">
					<h2 className="text-center font-bold text-2xl select-none">
						{title}
					</h2>
					<div className="font-mono text-md leading-8 break-all select-none">
						{message}
					</div>
					<div className="flex justify-center gap-8 w-full">
						<button
							className="grow px-4 py-2 font-semibold cursor-pointer text-white rounded-lg active:scale-92 duration-100 bg-green-500 hover:bg-green-600"
							onClick={() => {
								resolve(true);
								toast.remove(t.id);
							}}>
							Accept
						</button>
						<button
							className="grow px-4 py-2 font-semibold cursor-pointer text-black rounded-lg active:scale-92 duration-100 bg-gray-200 hover:bg-gray-300"
							onClick={() => {
								resolve(false);
								toast.remove(t.id);
							}}>
							Reject
						</button>
					</div>
				</div>
			),
			{
				id: cardId,
				duration: Infinity,
			}
		);
	});
}
