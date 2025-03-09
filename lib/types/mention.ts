import type { MentionType } from "./discord";

export interface MentionElement {
	type: "mention";
	mentionType: MentionType;
	data: {
		id: string;
		name: string;
		example: string;
	};
	children: [{ text: string }];
}
