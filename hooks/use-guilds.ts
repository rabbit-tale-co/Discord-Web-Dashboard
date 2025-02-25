import { useEffect, useState } from "react";
import { useAuth } from "@/app/authContext";
import { getCachedData, setCachedData } from "@/lib/cache";

interface Server {
	id: string;
	name: string;
	icon: string | null;
	owner: boolean;
	permissions: string;
	features: string[];
	premium_tier: number;
	has_bot: boolean;
	bot_joined?: boolean;
	approximate_member_count?: number;
}

interface CachedGuild {
	data: Server[] | GuildData;
	expiresAt: number;
}

export const useGuilds = () => {
	const { user } = useAuth();
	const [guilds, setGuilds] = useState<Server[]>(() => {
		const cached = getCachedData("guilds") as CachedGuild;
		return (cached?.data as Server[]) || [];
	});
	const [status, setStatus] = useState<"loading" | "error" | "success">(() => {
		return getCachedData("guilds") ? "success" : "loading";
	});
	const [error, setError] = useState<string | null>(null);
	const CACHE_TIME = "15m";

	useEffect(() => {
		if (!user) return;

		const cached = getCachedData("guilds") as CachedGuild;
		const now = Date.now();

		if (!cached?.data || cached.expiresAt <= now) {
			fetch("/api/guilds")
				.then(async (res) => {
					if (!res.ok) throw new Error("Failed to fetch guilds");
					return res.json();
				})
				.then((data) => {
					if (!Array.isArray(data)) {
						throw new Error("Invalid guilds data format");
					}
					setGuilds(data);
					setStatus("success");
					setCachedData("guilds", data, CACHE_TIME);
				})
				.catch((err) => {
					console.error("Error fetching guilds:", err);
					setStatus("error");
					setError(err.message);
				});
		}
	}, [user]);

	return { guilds, status, error };
};

export interface GuildData {
	category_count: number;
	text_channel_count: number;
	voice_channel_count: number;
	guild_details: {
		id: string;
		name: string;
		icon: string;
		features: string[];
		owner_id: string;
		approximate_member_count: number;
		description?: string;
		approximate_presence_count?: number;
		premium_tier?: number;
		premium_subscription_count?: number;
		region?: string;
	};
	roles: {
		id: string;
		name: string;
		color: number;
		position: number;
	}[];
	rolesCount: number;
	created_at: string;
}

export function useGuild(id: string) {
	const [guildData, setGuildData] = useState<GuildData | null>(() => {
		const cached = getCachedData(`guild-${id}`) as CachedGuild;
		return (cached?.data as GuildData) || null;
	});
	const [status, setStatus] = useState<"loading" | "error" | "success">(() => {
		return getCachedData(`guild-${id}`) ? "success" : "loading";
	});
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!id) return;

		const cached = getCachedData(`guild-${id}`) as CachedGuild;
		const now = Date.now();

		if (!cached?.data || cached.expiresAt <= now) {
			setStatus("loading");
			fetch(`/api/guilds/${id}`)
				.then(async (res) => {
					if (!res.ok) {
						const errorData = await res.json();
						throw new Error(errorData.error || "Failed to fetch guild");
					}
					return res.json();
				})
				.then((data) => {
					const transformedData = {
						category_count: data.category_count || 0,
						text_channel_count: data.text_channel_count,
						voice_channel_count: data.voice_channel_count,
						guild_details: data.guild_details,
						roles: data.roles,
						rolesCount: data.roles.length,
						region: data.region,
						created_at: data.created_at,
					};
					setGuildData(transformedData);
					setStatus("success");
					setCachedData(`guild-${id}`, transformedData, "15m");
				})
				.catch((err) => {
					console.error("Error fetching guild:", err);
					setError(err.message);
					setStatus("error");
				});
		}
	}, [id]);

	return { guildData, status, error };
}
