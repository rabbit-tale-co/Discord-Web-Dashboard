import type {
	Guild,
	GuildFeature,
	GuildMember,
	Role,
	GuildChannel,
	Channel,
} from "discord.js";

export interface GuildData {
	id: string;
	name: string;
	channels: Array<{
		id: string;
		name: string;
		type: number;
	}>;
	roles: Array<{
		id: string;
		name: string;
		color: number;
	}>;
}

// Export other useful Discord.js types
export type { Guild, GuildFeature, GuildMember, Role, GuildChannel };
