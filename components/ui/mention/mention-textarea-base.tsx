// Types
export type MentionType = "variable" | "role" | "channel";

export type MentionElement = {
	type: "mention";
	mentionType: MentionType;
	children: [{ text: "" }]; // void elements have empty text children
	value: string; // stored mention value (e.g., "<@&123>", "<#456>", "{var}")
	displayValue?: string; // optional display text for the user
};
