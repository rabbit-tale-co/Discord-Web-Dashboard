import type {
	Guild,
	GuildFeature,
	GuildMember,
	Role,
	GuildChannel,
} from "discord.js";

export interface GuildData {
	guild_details: {
		id: string;
		name: string;
		icon: string | null;
		features: GuildFeature[];
		owner_id: string;
		approximate_member_count: number;
		description?: string | null;
		approximate_presence_count?: number;
		premium_tier?: number;
		premium_subscription_count?: number;
		createdAt: string;
	};
	text_channel_count: number;
	voice_channel_count: number;
	roles: {
		id: string;
		name: string;
		color: number;
		position: number;
		permissions: string;
		managed: boolean;
		mentionable: boolean;
		icon?: string | null;
		unicodeEmoji?: string | null;
	}[];
}

// Export other useful Discord.js types
export type { Guild, GuildFeature, GuildMember, Role, GuildChannel };
