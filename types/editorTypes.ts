// editorTypes.ts
import type { MentionType } from "@/components/ui/mention";
import type { BaseEditor, Node } from "slate";
import type { ReactEditor, RenderLeafProps } from "slate-react";

export interface CustomText {
	text: string;
	bold?: boolean;
	italic?: boolean;
	code?: boolean;
	underline?: boolean;
	strikethrough?: boolean;
	spoiler?: boolean;
	title?: boolean;
	list?: boolean;
	hr?: boolean;
	blockquote?: boolean;
	url?: boolean;
	keyword?: boolean;
	punctuation?: boolean;
}

export interface ParagraphElement {
	type: "paragraph";
	children: Array<CustomText | StarWarsMentionElement | SpoilerElement>;
}

export interface MentionPlaceholderElement {
	type: "mention-placeholder";
	mentionType: MentionType;
	children: [{ text: "" }];
}

export interface SpoilerElement {
	type: "spoiler";
	children: [{ text: string }];
}

export interface StarWarsMentionElement {
	type: "mention";
	mentionType: MentionType;
	value: string;
	displayValue: string;
	needsUpdate?: boolean;
	children: [{ text: "" }];
}

// Helper type for Slate's CustomTypes interface
declare module "slate" {
	interface CustomTypes {
		Editor: BaseEditor & ReactEditor;
		Element:
			| ParagraphElement
			| StarWarsMentionElement
			| MentionPlaceholderElement
			| SpoilerElement;
		Text: CustomText;
	}
}

// Custom editor type for our component
export interface CustomEditor extends BaseEditor, ReactEditor {
	isInline: (element: Node) => boolean;
	isVoid: (element: Node) => boolean;
	markableVoid: (element: Node) => boolean;
	normalizeNode: (entry: [Node, number[]]) => void;
	insertText: (text: string) => void;
}

// Props for our main textarea component
export interface MentionTextareaProps {
	name?: string;
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	rows?: number;
	maxLength?: number;
	id?: string;
}

// Props for render leaf function
export type CustomRenderLeafProps = Omit<RenderLeafProps, "leaf"> & {
	leaf: CustomText;
};
