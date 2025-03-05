"use client";

import React from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Plugin } from "@/hooks/use-plugins";
import {
	hasPluginForm,
	getPluginForm,
} from "@/components/plugins/plugin-forms";
import { Separator } from "@/components/ui/separator";

interface ConfigProps {
	plugin: Plugin;
}

export function Config({ plugin }: ConfigProps) {
	// Get the form component for this plugin
	const PluginForm = plugin.id ? getPluginForm(plugin.id) : null;

	if (!plugin.enabled) {
		return null;
	}

	const name = {
		levels: "Levels",
		welcome_goodbye: "Welcome & Goodbye",
	};

	return (
		<Card className="py-6">
			{/* <CardHeader>
				<CardTitle>{name[plugin.id as keyof typeof name]} settings</CardTitle>
				<CardDescription>
					Customize the configuration of the{" "}
					{name[plugin.id as keyof typeof name]} plugin for your server.
				</CardDescription>
			</CardHeader> */}

			{/* <Separator /> */}

			<CardContent>
				{PluginForm ? (
					<PluginForm plugin={plugin} />
				) : (
					<p className="text-muted-foreground">
						No configuration options available for this plugin.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
