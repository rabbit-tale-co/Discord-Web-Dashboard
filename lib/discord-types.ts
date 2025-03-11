/**
 * This file contains type definitions from discord.js to avoid importing the library directly
 * in client components, which would cause issues with Node.js-specific dependencies.
 */

// Discord User interface
export interface DiscordUser {
	id: string;
	username: string;
	discriminator: string;
	avatar: string | null;
	bot?: boolean;
	system?: boolean;
	banner?: string | null;
	accent_color?: number | null;
	global_name?: string | null;
	avatar_decoration?: string | null;
	display_name?: string | null;
	banner_color?: string | null;
	locale?: string;
	verified?: boolean;
	email?: string | null;
	flags?: number;
	premium_type?: number;
	public_flags?: number;
}

// Guild Feature enum
export enum GuildFeature {
	ANIMATED_BANNER = "ANIMATED_BANNER",
	ANIMATED_ICON = "ANIMATED_ICON",
	APPLICATION_COMMAND_PERMISSIONS_V2 = "APPLICATION_COMMAND_PERMISSIONS_V2",
	AUTO_MODERATION = "AUTO_MODERATION",
	BANNER = "BANNER",
	COMMUNITY = "COMMUNITY",
	CREATOR_MONETIZABLE_PROVISIONAL = "CREATOR_MONETIZABLE_PROVISIONAL",
	CREATOR_STORE_PAGE = "CREATOR_STORE_PAGE",
	DEVELOPER_SUPPORT_SERVER = "DEVELOPER_SUPPORT_SERVER",
	DISCOVERABLE = "DISCOVERABLE",
	FEATURABLE = "FEATURABLE",
	INVITES_DISABLED = "INVITES_DISABLED",
	INVITE_SPLASH = "INVITE_SPLASH",
	MEMBER_VERIFICATION_GATE_ENABLED = "MEMBER_VERIFICATION_GATE_ENABLED",
	MORE_STICKERS = "MORE_STICKERS",
	NEWS = "NEWS",
	PARTNERED = "PARTNERED",
	PREVIEW_ENABLED = "PREVIEW_ENABLED",
	RAID_ALERTS_DISABLED = "RAID_ALERTS_DISABLED",
	ROLE_ICONS = "ROLE_ICONS",
	ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE = "ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE",
	ROLE_SUBSCRIPTIONS_ENABLED = "ROLE_SUBSCRIPTIONS_ENABLED",
	TICKETED_EVENTS_ENABLED = "TICKETED_EVENTS_ENABLED",
	VANITY_URL = "VANITY_URL",
	VERIFIED = "VERIFIED",
	VIP_REGIONS = "VIP_REGIONS",
	WELCOME_SCREEN_ENABLED = "WELCOME_SCREEN_ENABLED",
}
