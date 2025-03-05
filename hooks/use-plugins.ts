import { useEffect, useState, useCallback } from "react";
import { getCachedData, setCachedData } from "@/lib/cache";
import type { GuildData } from "@/types/guild";
import type { ButtonStyle, ComponentType, EmbedData } from "discord.js";

const CACHE_TIME = "15m";

export type Level = {
	enabled: boolean;
	reward_message: string;
	channel_id: string;
	command_channel_id: string;
	reward_roles:
		| Array<{
				level: number;
				role_id: string;
		  }>
		| [];
	boost_3x_roles: Array<string>;
};

export type WelcomeGoodbye = {
	enabled: boolean;
	type: "embed" | "text";
	welcome_message?: string;
	welcome_channel_id?: string;
	leave_message?: string;
	leave_channel_id?: string;
	embed_welcome?: {
		color?: number;
		title?: string;
		description?: string;
		fields?: Array<{
			name: string;
			value: string;
			inline?: boolean;
		}>;
		footer?: {
			text: string;
		};
		thumbnail?: {
			url: string;
		};
		image?: {
			url: string;
		};
	};
	embed_leave?: {
		color?: number;
		title?: string;
		description?: string;
		footer?: {
			text: string;
		};
	};
	join_role_id?: string;
};

export type TicketEmbed = {
	title?: string;
	description?: string;
	color?: number;
	footer?: string;
	thumbnail?: string;
	image?: string;
	fields?: Array<{
		name: string;
		value: string;
		inline?: boolean;
	}>;
	buttons_map?: Array<{
		unique_id: string;
		label: string;
		style: ButtonStyle;
		type: ComponentType;
		url?: string;
		disabled?: boolean;
	}>;
};

export type Ticket = {
	enabled?: boolean;
	admin_channel_id?: string | null;
	counter?: number;
	transcript_channel_id?: string | null;
	mods_role_ids?: Array<string> | null;
	embeds?: {
		open_ticket?: TicketEmbed | null;
		opened_ticket?: TicketEmbed | null;
		user_ticket?: TicketEmbed | null;
		closed_ticket?: TicketEmbed | null;
		confirm_close_ticket?: TicketEmbed | null;
		admin_ticket?: TicketEmbed | null;
		transcript?: TicketEmbed | null;
	};
};

export type Starboard = {
	enabled?: boolean;
	emojis?: string[];
	watch_channels?: string[] | null;
	channel_id?: string | null;
	threshold?: number;
};

export type Birthday = {
	enabled?: boolean;
	channel_id?: string | null;
	message?: string | null;
};

export type TempVC = {
	enabled?: boolean;
	channel_id?: string | null;
	title: string;
	durations?: Array<{
		role_id: string;
		minutes: number;
	}> | null;
};

export type Slowmode = {
	enabled?: boolean;
	watch_channels?: string[] | null;
	threshold?: number;
	duration?: number;
	rate_duration?: {
		high_rate: number;
		low_rate: number;
	};
};

export type ConnectSocial = {
	enabled: boolean;
	minecraft: {
		role_id: string | null;
	};
	youtube: {
		role_id: string | null;
	};
	twitter: {
		role_id: string | null;
	};
	tiktok: {
		role_id: string | null;
	};
	twitch: {
		role_id: string | null;
	};
};

export type Moderation = {
	enabled: boolean;
	watch_roles: string[];
	ban_interval: number;
	delete_message_days: number;
};

export type Music = {
	enabled: boolean;
	channel_id: string | null;
	role_id: string | null;
};

export type PluginTypes = {
	levels: Level;
	tickets: Ticket;
	welcome_goodbye: WelcomeGoodbye;
	starboard: Starboard;
	birthday: Birthday;
	tempvc: TempVC;
	slowmode: Slowmode;
	connectSocial: ConnectSocial;
	moderation: Moderation;
	music: Music;
};

// Helper function to safely extract guild ID from potentially different GuildData structures
function getGuildId(guildData: { guild_details?: { id: string }; id?: string }):
	| string
	| undefined {
	if (!guildData) return undefined;
	// Handle both possible structures
	return guildData.guild_details?.id || guildData.id;
}

// Add updatePluginsCache function
function updatePluginsCache(guildId: string, plugins: PluginTypes[]) {
	setCachedData(`plugins-${guildId}`, plugins, CACHE_TIME);
}

async function getPluginsFromAPI(guildId: string): Promise<PluginTypes[]> {
	try {
		const bot_id = process.env.NEXT_PUBLIC_BOT_ID;
		const response = await fetch(
			`/api/plugins?bot_id=${bot_id}&guild_id=${guildId}`,
			{
				cache: "no-store",
				headers: {
					"Cache-Control": "no-cache",
				},
			},
		);
		if (!response.ok) throw new Error("Failed to fetch plugins");
		const data = await response.json();

		if (data) {
			console.log("fetched plugins:", data);
			updatePluginsCache(guildId, data);
		}
		return data;
	} catch (err) {
		console.error("Error fetching plugins:", err);
		throw err;
	}
}

export default function usePlugins(guildData: GuildData) {
	const guild_id = getGuildId(guildData);

	const [plugins, setPlugins] = useState<PluginTypes[]>(() => {
		const cached = getCachedData<PluginTypes[]>(`plugins-${guild_id}`);
		return cached?.data || [];
	});
	const [status, setStatus] = useState<"loading" | "error" | "success">(() =>
		getCachedData(`plugins-${guild_id}`) ? "success" : "loading",
	);
	const [error, setError] = useState<Error | null>(null);

	const refetchPlugins = useCallback(async () => {
		if (!guild_id) return null;

		setStatus("loading");
		try {
			// Clear cache before refetching to ensure we get fresh data
			localStorage.removeItem(`cache-plugins-${guild_id}`);

			const data = await getPluginsFromAPI(guild_id);

			setPlugins(data);
			setStatus("success");
			return data;
		} catch (err) {
			setError(err as Error);
			setStatus("error");
			return null;
		}
	}, [guild_id]);

	useEffect(() => {
		if (!guild_id) return;

		const cached = getCachedData<PluginTypes[]>(`plugins-${guild_id}`);

		if (cached?.data && Date.now() <= cached.expiresAt) {
			setPlugins(cached.data);
			setStatus("success");
		} else {
			refetchPlugins();
		}
	}, [guild_id, refetchPlugins]);

	return { plugins, status, error, refetchPlugins };
}

export { usePlugins, updatePluginsCache };
