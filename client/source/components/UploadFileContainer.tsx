import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

export default function UploadFileContainer({
	accept,
	dragtext,
	hovertext,
	defaulttext,
	selectedFile,
	handleSelectedFile,
}: InterfaceUploadFileContainer) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isHovering, setIsHovering] = useState(false);

	const handleDrop = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragging(false);
		if (event.dataTransfer.files.length > 0) {
			handleSelectedFile(event.dataTransfer.files[0]);
		}
	};

	const handleDragOver = (event: React.DragEvent) => {
		event.preventDefault();
		if (!isDragging) setIsDragging(true);
	};

	const handleDragLeave = (event: React.DragEvent) => {
		event.preventDefault();
		const { clientX, clientY } = event;
		const element = event.currentTarget.getBoundingClientRect();
		if (clientX < element.left || clientX > element.right) {
			setIsDragging(false);
		} else if (clientY < element.top || clientY > element.bottom) {
			setIsDragging(false);
		}
	};

	const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files && event.target.files.length > 0) {
			handleSelectedFile(event.target.files[0]);
		}
	};

	return (
		<div
			onDrop={handleDrop}
			onClick={() => fileRef.current?.click()}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onPointerEnter={() => setIsHovering(true)}
			onPointerLeave={() => setIsHovering(false)}
			className={
				"relative flex flex-col items-center justify-center " +
				"p-8 rounded-xl border-2 border-dashed " +
				"cursor-pointer select-none transition-all " +
				(isDragging
					? "border-blue-500 bg-blue-50"
					: isHovering
					? "border-neutral-400 bg-neutral-100"
					: "border-neutral-300 bg-white")
			}>
			<UploadCloud size="48" className="my-2 text-neutral-600" />
			<p className="text-center text-neutral-600 select-none">
				{isDragging
					? dragtext
					: isHovering
					? hovertext
					: selectedFile
					? `Selected: ${selectedFile.name}`
					: defaulttext}
			</p>
			<input
				type="file"
				ref={fileRef}
				accept={accept}
				className="hidden"
				onChange={handleSelect}
			/>
		</div>
	);
}
