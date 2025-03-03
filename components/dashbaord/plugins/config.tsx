"use client";

import React from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { RotateCw } from "lucide-react";
import type { Plugin } from "@/hooks/use-plugins";
import { PluginConfigForm } from "@/components/plugins/plugin-config-form";
import { Separator } from "@/components/ui/separator";

export default function PluginConfig({
	plugin,
	guildId,
}: { plugin: Plugin; guildId: string }) {

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
					<PluginConfigForm
						plugin={plugin}
						guildId={guildId}
					/>
				</CardContent>
			</Card>
		</React.Fragment>
	);
}
