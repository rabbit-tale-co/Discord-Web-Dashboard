import type { BaseEditor } from "slate";
import type { ReactEditor } from "slate-react";

export interface WindowWithEditors extends Window {
	__slateEditorInstances?: Record<string, BaseEditor>;
}

export type ChannelType = 0 | 1 | 2 | 3 | 4 | 5 | 13 | 15; // Discord API channel types

export interface Channel {
	id: string;
	name: string;
	type: ChannelType;
}

export type MentionType = "variable" | "role" | "channel";

interface BaseMentionElement {
	type: "mention";
	mentionType: MentionType;
	value: string;
	displayValue: string;
	children: [{ text: "" }];
}

export interface RoleMentionElement extends BaseMentionElement {
	mentionType: "role";
}

export interface ChannelMentionElement extends BaseMentionElement {
	mentionType: "channel";
}

export interface VariableMentionElement extends BaseMentionElement {
	mentionType: "variable";
}

export type MentionElement =
	| RoleMentionElement
	| ChannelMentionElement
	| VariableMentionElement;

export interface MentionPlaceholderElement {
	type: "mention-placeholder";
	mentionType: MentionType;
	children: [{ text: string }];
}

export interface ParagraphElement {
	type: "paragraph";
	children: Array<CustomText | MentionElement | MentionPlaceholderElement>;
}

export type CustomText = {
	text: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	strikethrough?: boolean;
	code?: boolean;
};

export type CustomElement =
	| ParagraphElement
	| MentionElement
	| MentionPlaceholderElement;

export type CustomEditor = BaseEditor & ReactEditor;
