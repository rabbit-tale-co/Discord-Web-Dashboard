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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Plugin } from "@/hooks/use-plugins";
import Config from "@/components/dashbaord/plugins/config";

export default function PluginPage() {
	const params = useParams();
	const guildId = params.id as string;
	const pluginId = params.pluginId as string; // Prawidłowe pobieranie ID pluginu
	const { pluginsData, refetchPlugins } = useServerPlugins();
	const [plugin, setPlugin] = useState<Plugin | null>(null);
	const [isEnabled, setIsEnabled] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	// console.log(plugin);

	// Pobierz dane pluginu na podstawie ID
	useEffect(() => {
		if (pluginsData && pluginsData.length > 0) {
			const foundPlugin = pluginsData.find((p) => p.id === pluginId);
			if (foundPlugin) {
				setPlugin(foundPlugin);
				setIsEnabled(foundPlugin.enabled);
			}
		}
	}, [pluginsData, pluginId]);

	const handleSave = async () => {
		if (!plugin) return;

		setIsSaving(true);
		try {
			// Wysyłanie żądania do API w celu aktualizacji ustawień pluginu
			const response = await fetch(`/api/plugins/${pluginId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					guildId,
					enabled: isEnabled,
					// Dodaj inne ustawienia, które mogą być zmienione
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to update plugin settings");
			}

			// Odśwież dane pluginów po zapisaniu
			await refetchPlugins();

			toast.success("Ustawienia zapisane", {
				description: "Ustawienia pluginu zostały pomyślnie zaktualizowane.",
			});
		} catch (error) {
			console.error("Error saving plugin settings:", error);
			toast.error("Nie udało się zapisać ustawień pluginu.", {
				description: "Spróbuj ponownie później.",
			});
		} finally {
			setIsSaving(false);
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
					<Button
						onClick={handleSave}
						disabled={isSaving}
						size={"lg"}
						type={"submit"}
					>
						{isSaving ? "Saving..." : "Save changes"}
						{/* {!isSaving && <Save className="size-5.5" />} */}
					</Button>
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
					<React.Fragment>
						<Card className="py-6">
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="text-2xl">
										{String(plugin.name || plugin.id)}
									</CardTitle>
									<Badge variant={isEnabled ? "default" : "destructive"}>
										{isEnabled ? "Active" : "Inactive"}
									</Badge>
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
										<Switch
											checked={isEnabled}
											onCheckedChange={setIsEnabled}
										/>
									</div>

									{/* Tutaj można dodać więcej ustawień specyficznych dla danego pluginu */}
								</div>
							</CardContent>

							{/* <CardFooter className="flex justify-end">
									<Button onClick={handleSave} disabled={isSaving}>
										{isSaving ? "Saving..." : "Save changes"}
										{!isSaving && <Save className="size-5" />}
									</Button>
								</CardFooter> */}
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
