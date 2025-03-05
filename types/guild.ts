import type {
	Guild,
	GuildFeature,
	GuildMember,
	Role,
	GuildChannel,
	Channel,
} from "discord.js";

// Discord types
export interface RawRole {
	id: string;
	name: string;
	color?: number;
}

export interface RawChannel {
	id: string;
	name: string;
	type?: number;
}

// Interface for Guild Data
export interface GuildData {
	id: string;
	name: string;
	roles: RawRole[];
	channels: RawChannel[];
}

// Extend window interface
declare global {
	interface Window {
		__guildData?: GuildData;
	}
}

// Export a type guard for GuildData
export function isGuildData(data: unknown): data is GuildData {
	if (!data || typeof data !== "object") return false;

	const guildData = data as GuildData;
	return (
		typeof guildData.id === "string" &&
		typeof guildData.name === "string" &&
		Array.isArray(guildData.roles) &&
		Array.isArray(guildData.channels)
	);
}

// Export other useful Discord.js types
export type { Guild, GuildFeature, GuildMember, Role, GuildChannel };
