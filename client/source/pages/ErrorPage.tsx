import { ShieldAlert } from "lucide-react";
import { Link } from "react-router";

export default function ErrorPage() {
	return (
		<div className="absolute flex flex-col items-center top-1/2 left-1/2 -translate-1/2">
			<div className="flex items-stretch justify-between">
				<div className="p-8">
					<span className="text-6xl font-bold select-none">404</span>
				</div>
				<div className="border"></div>
				<div className="flex items-center p-8 gap-x-4">
					<ShieldAlert className="stroke-[1.2] scale-200" />
					<span className="text-2xl font-bold select-none">Page Not Found</span>
				</div>
			</div>
			<div className="p-8">
				<Link to="/" className="text-xl italic select-none link-underline">
					Return to Homepage
				</Link>
			</div>
		</div>
	);
}
