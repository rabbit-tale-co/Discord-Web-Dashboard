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
	icon?: string;
	guild_details?: {
		id?: string;
		name?: string;
		icon?: string | null;
		banner?: string | null;
		description?: string | null;
		premium_tier?: number | null;
		premium_subscription_count?: number | null;
		nsfw_level?: number | null;
		explicit_content_filter?: number | null;
		system_channel_id?: string | null;
		owner_id?: string;
		features?: GuildFeature[];
		approximate_member_count?: number;
		approximate_presence_count?: number;
		createdAt?: string;
	};
	roles: RawRole[];
	channels: RawChannel[];
	category_count?: number;
	text_channel_count?: number;
	voice_channel_count?: number;
	rolesCount?: number;
	created_at?: string;
	features?: string[];
	premium_tier?: number;
	premium_subscription_count?: number;
	nsfw_level?: number;
	explicit_content_filter?: number;
	system_channel_id?: string;
	system_channel_flags?: number;
	region?: string;
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
