"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useServerPlugins } from "@/context/plugins-context";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Plugin } from "@/hooks/use-plugins";
import Config from "@/components/dashbaord/plugins/config";

export default function PluginPage() {
	const params = useParams();
	const guildId = params.id as string;
	const pluginId = params.pluginId as string; // Prawidłowe pobieranie ID pluginu
	const { pluginsData, refetchPlugins, lastUpdated } = useServerPlugins();
	const [plugin, setPlugin] = useState<Plugin | null>(null);
	const [status, setStatus] = useState<"loading" | "error" | "success">(
		"loading",
	);

	// console.log(plugin);

	// Pobierz dane pluginu na podstawie ID
	useEffect(() => {
		if (pluginsData && pluginsData.length > 0) {
			const foundPlugin = pluginsData.find((p) => p.id === pluginId);
			if (foundPlugin) {
				setPlugin(foundPlugin);
				setStatus(foundPlugin.enabled ? "success" : "error");
			}
		}
	}, [pluginsData, pluginId]);

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

			console.log(
				`Using ${endpoint} endpoint based on switch state: ${newEnabledState ? "enabled" : "disabled"}`,
			);

			// Get bot_id from environment variables
			const bot_id = process.env.NEXT_PUBLIC_BOT_ID;
			if (!bot_id) {
				throw new Error("Bot ID not configured in environment variables");
			}

			// Log the request details
			console.log("Sending request to:", endpoint);
			console.log("Request payload:", {
				bot_id: "[HIDDEN]",
				guild_id: guildId,
				plugin_name: pluginId,
			});

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

			console.log("Response status:", response.status, response.statusText);

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
			console.log("API Response data:", responseData);

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

	return (
		<main className="container mx-auto py-3 px-4 sm:px-6 sm:py-6">
			<div className="mt-3 sm:mt-6 space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
							Dashboard
						</h2>
					</div>
					{/* <Button
						onClick={handleSave}
						disabled={isSaving}
						size={"lg"}
						type={"submit"}
					>
						{isSaving ? "Saving..." : "Save changes"}
					</Button> */}
				</div>
				<div className="mb-6">
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
						key={`plugin-${plugin.id}-${plugin.enabled}-${lastUpdated}`}
					>
						<Card className="py-6">
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="text-2xl">
										{String(plugin.name || plugin.id)}
									</CardTitle>
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
							</CardHeader>

							<CardContent>
								<div className="space-y-6">
									<div className="flex items-center justify-between">
										<div>
											<h3 className="font-medium">Plugin status</h3>
											<p className="text-sm text-muted-foreground">
												Enable or disable this plugin
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
									</div>

									{/* Tutaj można dodać więcej ustawień specyficznych dla danego pluginu */}
								</div>
							</CardContent>

							<CardFooter className="flex justify-end">
								{/* Save button removed since we now save automatically on toggle */}
							</CardFooter>
						</Card>

						<Config plugin={plugin} guildId={guildId} />
					</React.Fragment>
				) : (
					<div className="flex items-center justify-center h-full">
						<p className="text-muted-foreground">Plugin not found</p>
					</div>
				)}
			</div>
		</main>
	);
}
