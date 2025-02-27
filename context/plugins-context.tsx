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
import type { Plugin } from "@/hooks/use-plugins";
import { usePlugins } from "@/hooks/use-plugins";
import { type GuildData, useGuild } from "@/hooks/use-guilds";
import { useParams } from "next/navigation";

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
	const { plugins, status, error, refetchPlugins } = usePlugins(
		guildData as GuildData,
	);
	const { pluginsData, updatePlugins, lastUpdated } = usePluginsContext();

	const prevGuildIdRef = useRef<string | null>(null);

	useEffect(() => {
		if (guildId && prevGuildIdRef.current !== guildId) {
			console.log(
				`useServerPlugins: Zmieniono serwer z ${prevGuildIdRef.current} na ${guildId}`,
			);
			prevGuildIdRef.current = guildId;
			if (plugins && plugins.length > 0) {
				updatePlugins(plugins);
			}
		}
	}, [guildId, plugins, updatePlugins]);

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

	const updatePlugins = useCallback((plugins: Plugin[]) => {
		setPluginsData((prevPlugins) => {
			// Check if the plugins are the same
			if (JSON.stringify(prevPlugins) === JSON.stringify(plugins)) {
				return prevPlugins;
			}
			setLastUpdated(Date.now());
			return plugins;
		});
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
