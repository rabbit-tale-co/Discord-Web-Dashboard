import type React from "react";
import type { CustomRenderLeafProps } from "@/types/editorTypes";

const Leaf: React.FC<CustomRenderLeafProps> = ({
	attributes,
	children,
	leaf,
}) => {
	if (leaf.bold) children = <strong>{children}</strong>;
	if (leaf.code)
		children = (
			<code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
				{children}
			</code>
		);
	if (leaf.italic) children = <em>{children}</em>;
	if (leaf.underline) children = <u>{children}</u>;
	if (leaf.strikethrough) children = <s>{children}</s>;
	if (leaf.spoiler)
		children = (
			<span className="bg-gray-800 text-transparent hover:text-white cursor-pointer">
				{children}
			</span>
		);
	if (leaf.title)
		return (
			<span {...attributes} className="inline-block font-bold text-lg my-2">
				{children}
			</span>
		);
	if (leaf.list)
		return (
			<span {...attributes} className="text-blue-600">
				{children}
			</span>
		);
	if (leaf.hr)
		return (
			<span
				{...attributes}
				className="block text-center border-b-2 border-gray-300"
			>
				{children}
			</span>
		);
	if (leaf.blockquote)
		return (
			<span
				{...attributes}
				className="inline-block border-l-2 border-gray-300 pl-2 text-gray-500 italic"
			>
				{children}
			</span>
		);
	if (leaf.url)
		return (
			<span {...attributes} className="text-blue-500 underline">
				{children}
			</span>
		);
	if (leaf.keyword)
		return (
			<span {...attributes} className="text-purple-600 font-bold">
				{children}
			</span>
		);
	if (leaf.punctuation)
		return (
			<span {...attributes} className="text-gray-500">
				{children}
			</span>
		);
	return <span {...attributes}>{children}</span>;
};

export default Leaf;
