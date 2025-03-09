export type MentionType = "variable" | "role" | "channel";

export interface Channel {
	id: string;
	name: string;
	type: number;
}

export interface Variable {
	id: string;
	name: string;
	category: string;
}

export interface Category {
	id: string;
	name: string;
	icon: string;
}

export interface GuildData {
	id: string;
	name: string;
	roles: Array<{
		id: string;
		name: string;
		color?: number;
	}>;
	channels: Channel[];
}
