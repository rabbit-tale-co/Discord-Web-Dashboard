import { useEffect, useState, useCallback } from "react";
import { getCachedData, setCachedData } from "@/lib/cache";
import type { GuildData } from "@/types/guild";

const CACHE_TIME = "15m";

export interface Plugin {
	id: string;
	enabled: boolean;
	[key: string]: string | boolean | number | Record<string, unknown>;
}

async function getPluginsFromAPI(guildId: string): Promise<Plugin[]> {
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
			setCachedData(`plugins-${guildId}`, data, CACHE_TIME);
		}
		return data;
	} catch (err) {
		console.error("Error fetching plugins:", err);
		throw err;
	}
}

export default function usePlugins(guildData: GuildData) {
	const [plugins, setPlugins] = useState<Plugin[]>(() => {
		const cached = getCachedData<Plugin[]>(
			`plugins-${guildData?.guild_details.id}`,
		);
		return cached?.data || [];
	});
	const [status, setStatus] = useState<"loading" | "error" | "success">(() =>
		getCachedData(`plugins-${guildData?.guild_details.id}`)
			? "success"
			: "loading",
	);
	const [error, setError] = useState<Error | null>(null);

	const refetchPlugins = useCallback(async () => {
		const guild_id = guildData?.guild_details.id;
		if (!guild_id) return;

		setStatus("loading");
		try {
			const data = await getPluginsFromAPI(guild_id);
			setPlugins(data);
			setStatus("success");
		} catch (err) {
			setError(err as Error);
			setStatus("error");
		}
	}, [guildData?.guild_details.id]);

	useEffect(() => {
		const guild_id = guildData?.guild_details.id;
		if (!guild_id) return;

		const cached = getCachedData<Plugin[]>(`plugins-${guild_id}`);

		if (cached?.data && Date.now() <= cached.expiresAt) {
			setPlugins(cached.data);
			setStatus("success");
		} else {
			refetchPlugins();
		}
	}, [guildData?.guild_details.id, refetchPlugins]);

	return { plugins, status, error, refetchPlugins };
}

export { usePlugins };
