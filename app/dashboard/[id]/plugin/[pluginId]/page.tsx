"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useServerPlugins } from "@/context/plugins-context";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type {
	PluginTypes,
	Level,
	Ticket,
	WelcomeGoodbye,
} from "@/hooks/use-plugins";
import { Config } from "@/components/dashbaord/plugins/config";

// Define a union type for all possible plugin types
type SpecificPlugin = Level | Ticket | WelcomeGoodbye; // Add other plugin types as needed

// Define a type for a single plugin
type Plugin = {
	id: string;
};

// Function to get the specific plugin based on pluginId
function getSpecificPlugin(
	pluginId: string,
	plugins: PluginTypes,
): SpecificPlugin | null {
	switch (pluginId) {
		case "levels":
			return plugins.levels;
		case "tickets":
			return plugins.tickets;
		case "welcome_goodbye":
			return plugins.welcome_goodbye;
		// Add cases for other plugin types as needed
		default:
			return null;
	}
}

// Function to map plugins to PluginTypes
function mapPluginsToPluginTypes(plugins: Plugin[]): PluginTypes {
	const pluginTypes: Partial<PluginTypes> = {};

	for (const plugin of plugins) {
		switch (plugin.id) {
			case "levels":
				pluginTypes.levels = plugin as unknown as Level;
				break;
			case "tickets":
				pluginTypes.tickets = plugin as unknown as Ticket;
				break;
			case "welcome_goodbye":
				pluginTypes.welcome_goodbye = plugin as unknown as WelcomeGoodbye;
				break;
			// Add cases for other plugin types as needed
		}
	}

	return pluginTypes as PluginTypes;
}

export default function PluginPage() {
	const params = useParams();
	const guildId = params.id as string;
	const pluginId = params.pluginId as string;
	const { pluginsData, refetchPlugins, lastUpdated } = useServerPlugins();
	const [plugin, setPlugin] = useState<SpecificPlugin | null>(null);
	const [status, setStatus] = useState<"loading" | "error" | "success">(
		"loading",
	);

	// console.log(plugin);

	// Pobierz dane pluginu na podstawie ID
	useEffect(() => {
		if (Array.isArray(pluginsData)) {
			const pluginTypes = mapPluginsToPluginTypes(pluginsData);
			const specificPlugin = getSpecificPlugin(pluginId, pluginTypes);
			if (specificPlugin) {
				setPlugin(specificPlugin);
				setStatus(specificPlugin.enabled ? "success" : "error");
			}
		}
	}, [pluginsData, pluginId]);

	// Listen for plugin config updates
	useEffect(() => {
		const handlePluginConfigSaved = (event: Event) => {
			const customEvent = event as CustomEvent<{ pluginId: string }>;
			if (customEvent.detail?.pluginId === pluginId) {
				// Refetch plugins to get the latest data
				refetchPlugins();
			}
		};

		window.addEventListener("plugin-config-saved", handlePluginConfigSaved);

		return () => {
			window.removeEventListener(
				"plugin-config-saved",
				handlePluginConfigSaved,
			);
		};
	}, [pluginId, refetchPlugins]);

	const handleSave = async () => {
		if (!plugin) return;

		// Toggle the plugin status locally for immediate UI feedback
		const newEnabledState = !plugin.enabled;
		setPlugin({ ...plugin, enabled: newEnabledState });
		setStatus("loading");

		try {
			// Determine the correct endpoint based on the NEW enabled state
			const endpoint = newEnabledState
				? "/api/plugins/enable"
				: "/api/plugins/disable";

			// console.log(
			// 	`Using ${endpoint} endpoint based on switch state: ${newEnabledState ? "enabled" : "disabled"}`,
			// );

			// Get bot_id from environment variables
			const bot_id = process.env.NEXT_PUBLIC_BOT_ID;
			if (!bot_id) {
				throw new Error("Bot ID not configured in environment variables");
			}

			// Log the request details
			// console.log("Sending request to:", endpoint);
			// console.log("Request payload:", {
			// 	bot_id: "[HIDDEN]",
			// 	guild_id: guildId,
			// 	plugin_name: pluginId,
			// });

			// Send request to the appropriate API endpoint
			// Using parameter names that match the backend API expectations
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					bot_id,
					guild_id: guildId,
					plugin_name: pluginId,
				}),
			});

			// console.log("Response status:", response.status, response.statusText);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("API Error:", {
					status: response.status,
					statusText: response.statusText,
					body: errorText,
				});
				throw new Error(
					`Failed to ${newEnabledState ? "enable" : "disable"} plugin: ${errorText}`,
				);
			}

			const responseData = await response.json();
			// console.log("API Response data:", responseData);

			// Only call refetchPlugins once
			await refetchPlugins();

			toast.success(newEnabledState ? "Plugin enabled" : "Plugin disabled", {
				description: `The plugin was successfully ${newEnabledState ? "enabled" : "disabled"}.`,
			});

			// Set status based on the new state
			setStatus(newEnabledState ? "success" : "error");
		} catch (error) {
			console.error("Error toggling plugin state:", error);
			toast.error(
				`Failed to ${newEnabledState ? "enable" : "disable"} plugin`,
				{
					description: "Please try again later or contact support.",
				},
			);

			// Revert the switch state in case of error
			setPlugin({ ...plugin, enabled: !newEnabledState });
			setStatus(!newEnabledState ? "success" : "error");
		}
	};

	const name = {
		levels: "Levels",
		tickets: "Tickets",
		welcome_goodbye: "Welcome & Goodbye",
	};

	const date = new Date(lastUpdated);
	const formattedDate = date.toLocaleString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
	});
	return (
		<div className="container mx-auto space-y-6 p-4 sm:p-6 pb-8">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
						Dashboard
					</h2>
				</div>
			</div>
			<div>
				<Link
					href={`/dashboard/${guildId}`}
					className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="mr-2 size-4" />
					Back to dashboard
				</Link>
			</div>

			{plugin ? (
				<React.Fragment
					key={`plugin-${pluginId}-${plugin.enabled}-${lastUpdated}`}
				>
					<div className="space-y-6">
						<div className="flex items-center justify-between ">
							<div>
								<h2 className="text-2xl font-semibold">
									{name[pluginId as keyof typeof name]}
								</h2>
								<p className="text-sm text-muted-foreground">
									Customize the configuration of the{" "}
									{name[pluginId as keyof typeof name]} plugin for your server.
								</p>
							</div>
							{status === "loading" ? (
								<Badge variant="outline">Pending</Badge>
							) : (
								<Badge
									variant={
										plugin.enabled && status === "success"
											? "default"
											: "destructive"
									}
								>
									{plugin.enabled ? "Active" : "Inactive"}
								</Badge>
							)}
						</div>

						<div className="space-y-6">
							{/* <div className="flex items-center justify-between">
								<div>
									<h3 className="font-medium">
										Enable {name[pluginId as keyof typeof name]}
									</h3>
									<p className="text-sm text-muted-foreground">
										Activate the {name[pluginId as keyof typeof name]} plugin in
										your server
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Switch
										checked={plugin.enabled}
										onCheckedChange={() => {
											handleSave();
										}}
										className={`${status === "loading" ? "cursor-not-allowed" : "cursor-pointer"}`}
										disabled={status === "loading"}
									/>
								</div>
							</div> */}

							<Config plugin={plugin} />
						</div>
					</div>
				</React.Fragment>
			) : (
				<div className="flex items-center justify-center h-[50vh]">
					<p className="text-muted-foreground">Plugin not found</p>
				</div>
			)}
		</div>
	);
}
