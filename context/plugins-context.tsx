"use client";

import {
	createContext,
	useContext,
	useState,
	useCallback,
	useMemo,
	useEffect,
	useRef,
} from "react";
import type {
	PluginTypes,
	Level,
	Ticket,
	WelcomeGoodbye,
} from "@/hooks/use-plugins";
import { usePlugins } from "@/hooks/use-plugins";
import { useGuild } from "@/hooks/use-guilds";
import { useParams } from "next/navigation";
import type { GuildData } from "@/hooks/use-guilds";

// Define the base plugin type using the types from use-plugins.ts
export type Plugin = {
	id: string;
	enabled: boolean;
} & Partial<PluginTypes>;

interface PluginsContextType {
	pluginsData: Plugin[];
	updatePlugins: (plugins: Plugin[]) => void;
	lastUpdated: number;
}

const PluginsContext = createContext<PluginsContextType>({
	pluginsData: [],
	updatePlugins: () => {},
	lastUpdated: 0,
});

export const usePluginsContext = () => useContext(PluginsContext);

export function useServerPlugins() {
	const params = useParams();
	const guildId = params.id as string;
	const { guildData } = useGuild(guildId);

	// Use useMemo to prevent recreating this object on every render
	const formattedGuildData = useMemo(() => {
		return (
			guildData || {
				id: guildId,
				name: "Unknown Server",
				channels: [],
				roles: [],
				category_count: 0,
				text_channel_count: 0,
				voice_channel_count: 0,
				guild_details: {
					id: guildId,
					name: "Unknown Server",
					icon: null,
					features: [],
					owner_id: "",
					approximate_member_count: 0,
					createdAt: new Date().toISOString(),
				},
				rolesCount: 0,
				created_at: new Date().toISOString(),
			}
		);
	}, [guildData, guildId]);

	const {
		plugins,
		status,
		error,
		refetchPlugins: originalRefetchPlugins,
	} = usePlugins(formattedGuildData);

	const { pluginsData, updatePlugins, lastUpdated } = usePluginsContext();

	const prevGuildIdRef = useRef<string | null>(null);
	const pluginsUpdatedRef = useRef(false);

	// Simplified refetchPlugins that doesn't cause infinite loops
	const refetchPlugins = useCallback(async () => {
		try {
			const freshData = await originalRefetchPlugins();
			if (freshData && Array.isArray(freshData)) {
				const mappedPlugins = freshData.map((pluginData) => {
					const plugin: Plugin = {
						id: pluginData.id || "",
						enabled: false,
						...pluginData,
					};
					return plugin;
				});
				updatePlugins(mappedPlugins);
			}
			return freshData;
		} catch (err) {
			console.error("Error in refetchPlugins:", err);
			return null;
		}
	}, [originalRefetchPlugins, updatePlugins]);

	// Update plugins only once when they first load or when server changes
	useEffect(() => {
		if (!plugins?.length || pluginsUpdatedRef.current) return;

		const mappedPlugins = plugins.map((pluginData) => {
			const plugin: Plugin = {
				id: pluginData.id || "",
				enabled: false,
				...pluginData,
			};
			return plugin;
		});
		updatePlugins(mappedPlugins);
		pluginsUpdatedRef.current = true;
	}, [plugins, updatePlugins]);

	// Reset the update flag when server changes
	useEffect(() => {
		if (guildId && prevGuildIdRef.current !== guildId) {
			console.log(
				`useServerPlugins: Zmieniono serwer z ${prevGuildIdRef.current} na ${guildId}`,
			);
			prevGuildIdRef.current = guildId;
			pluginsUpdatedRef.current = false;
		}
	}, [guildId]);

	return {
		pluginsData,
		status,
		error,
		refetchPlugins,
		guildId,
		lastUpdated,
	};
}

export function PluginsProvider({ children }: { children: React.ReactNode }) {
	const [pluginsData, setPluginsData] = useState<Plugin[]>([]);
	const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

	// Keep track of the last update to prevent duplicate updates
	const lastPluginsJsonRef = useRef<string>("");

	const updatePlugins = useCallback((plugins: Plugin[]) => {
		// Stringify once for comparison
		const pluginsJson = JSON.stringify(plugins);

		// Only update if the plugins have actually changed
		if (pluginsJson !== lastPluginsJsonRef.current) {
			lastPluginsJsonRef.current = pluginsJson;
			setPluginsData(plugins);
			setLastUpdated(Date.now());
		}
	}, []);

	const contextValue = useMemo(
		() => ({
			pluginsData,
			updatePlugins,
			lastUpdated,
		}),
		[pluginsData, updatePlugins, lastUpdated],
	);

	return (
		<PluginsContext.Provider value={contextValue}>
			{children}
		</PluginsContext.Provider>
	);
}
