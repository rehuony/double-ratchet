import { Link } from "react-router";

export default function LazyUnderlineLink({ text, link }: InterfaceLazyUnderlineLink) {
	return (
		<Link
			to={link}
			className={
				"relative italic select-none " +
				"after:absolute after:left-0 after:bottom-0 after:w-full after:h-0.5 " +
				"after:content-[''] after:bg-current after:transition after:duration-500 " +
				"after:rotate-y-90 hover:after:rotate-y-0"
			}>
			{text}
		</Link>
	);
}
