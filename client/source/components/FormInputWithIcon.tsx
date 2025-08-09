export default function FormInputWithIcon({
	name,
	type,
	value,
	children,
	placeholder,
	handleChange,
}: InterfaceFormInputWithIcon) {
	return (
		<div className="flex items-center justify-between py-2 gap-x-2">
			{children}
			<input
				required
				type={type}
				name={name}
				value={value}
				placeholder={placeholder}
				onChange={event => handleChange(event.target.value)}
				className="grow px-2 text-lg border-b border-neutral-300 outline-none focus:border-black placeholder:select-none"
			/>
		</div>
	);
}
