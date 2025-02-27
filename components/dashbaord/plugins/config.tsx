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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, RotateCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Plugin } from "@/hooks/use-plugins";
import { PluginConfigForm } from "@/components/plugins/plugin-config-form";
import { Separator } from "@/components/ui/separator";

export default function PluginConfig({
	plugin,
	guildId,
}: { plugin: Plugin; guildId: string }) {
	const params = useParams();
	const pluginId = params.pluginId as string;
	const { pluginsData, refetchPlugins } = useServerPlugins();
	const [isSaving, setIsSaving] = useState(false);
	const [currentTab, setCurrentTab] = useState("basic");

	const handleSave = async (updatedConfig: Partial<Plugin>) => {
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
					...updatedConfig,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to update plugin settings");
			}

			// Odśwież dane pluginów po zapisaniu
			await refetchPlugins();

			toast.success("Konfiguracja zapisana", {
				description: "Ustawienia pluginu zostały pomyślnie zaktualizowane.",
			});
		} catch (error) {
			console.error("Error saving plugin settings:", error);
			toast.error("Nie udało się zapisać konfiguracji pluginu.", {
				description: "Spróbuj ponownie później.",
			});
		} finally {
			setIsSaving(false);
		}
	};

	if (!plugin) {
		return (
			<div className="container mx-auto py-6">
				<Card>
					<CardHeader>
						<div className="flex items-center">
							<CardTitle>Loading configuration...</CardTitle>
							<RotateCw className="ml-2 h-4 w-4 animate-spin" />
						</div>
					</CardHeader>
				</Card>
			</div>
		);
	}

	return (
		<React.Fragment>
			<div className="my-6 flex items-center justify-between">
				{/* <Link
					href={`/dashboard/${guildId}/plugin/${pluginId}`}
					className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Powrót do pluginu
				</Link> */}

				<h1 className="text-2xl font-bold">Configuration</h1>
			</div>

			<Card className="py-6">
				<CardHeader>
					<CardTitle>Plugin settings</CardTitle>
					<CardDescription>
						Customize the configuration of the{" "}
						{String(plugin.name || plugin.id)} plugin for your server.
					</CardDescription>
				</CardHeader>

				<Separator />

				<CardContent className="pt-6">
					<Tabs
						defaultValue="basic"
						className="w-full"
						onValueChange={setCurrentTab}
					>
						<TabsList className="mb-4">
							<TabsTrigger value="basic">Basic</TabsTrigger>
							<TabsTrigger value="advanced">Advanced</TabsTrigger>
						</TabsList>

						<PluginConfigForm
							plugin={plugin}
							guildId={guildId}
							onSave={handleSave}
							isSaving={isSaving}
							type={currentTab as "basic" | "advanced"}
						/>
					</Tabs>
				</CardContent>
			</Card>
		</React.Fragment>
	);
}
