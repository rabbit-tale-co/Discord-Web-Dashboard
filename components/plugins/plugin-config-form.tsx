"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import type { Plugin } from "@/hooks/use-plugins";

// Import our custom field components
import { ChannelField } from "./fields/channel-field";
import { RoleField } from "./fields/role-field";
import { TextField } from "./fields/text-field";
import { ToggleField } from "./fields/toggle-field";
import { ArrayField } from "./fields/array-field";
import { ColorField } from "./fields/color-field";
import { MessageField } from "./fields/message-field";
import { EmojiField } from "./fields/emoji-field";

type PluginConfigFormProps = {
	plugin: Plugin;
	guildId: string;
	onSave: (config: Partial<Plugin>) => Promise<void>;
	isSaving: boolean;
	type: "basic" | "advanced";
};

export function PluginConfigForm({
	plugin,
	guildId,
	onSave,
	isSaving,
	type,
}: PluginConfigFormProps) {
	const [formSchema, setFormSchema] = useState<z.ZodObject<any>>();
	const [defaultValues, setDefaultValues] = useState<any>({});
	const [fields, setFields] = useState<React.ReactNode[]>([]);

	// Dynamically create the form schema and fields based on plugin type
	useEffect(() => {
		const schemaFields: Record<string, any> = {};
		const values: Record<string, any> = {};
		const formFields: React.ReactNode[] = [];

		// Always add the 'enabled' field to basic tab
		// if (type === "basic") {
		// 	schemaFields.enabled = z.boolean();
		// 	values.enabled = plugin.enabled;

		// 	formFields.push(
		// 		<ToggleField
		// 			key="enabled"
		// 			name="enabled"
		// 			label="Status pluginu"
		// 			description="Włącz lub wyłącz ten plugin"
		// 		/>,
		// 	);
		// }

		//TODO: for every input insert data from plugin config JSON
		// Create different fields based on plugin ID
		switch (plugin.id) {
			case "levels":
				if (type === "basic") {
					// Basic settings
					schemaFields.channel_id = z.string().optional();
					values.channel_id = plugin.channel_id;
					formFields.push(
						<ChannelField
							key="channel_id"
							name="channel_id"
							label="Levels channel"
							description="Channel to send level up notifications"
							guildId={guildId}
						/>,
					);

					schemaFields.reward_message = z.string();
					values.reward_message = plugin.reward_message;
					formFields.push(
						<MessageField
							key="reward_message"
							name="reward_message"
							label="Reward message"
							description="Message sent when a user reaches a new level. You can use {level} as a placeholder."
						/>,
					);
				} else {
					// Advanced settings
					schemaFields.reward_roles = z.array(
						z.object({
							level: z.number(),
							role_id: z.string(),
						}),
					);
					values.reward_roles = plugin.reward_roles || [];
					formFields.push(
						<ArrayField
							key="reward_roles"
							name="reward_roles"
							label="Roles for levels"
							description="Roles awarded for reaching specific levels"
							guildId={guildId}
							arrayType="levelRoles"
						/>,
					);

					schemaFields.boost_3x_roles = z.array(
						z.object({
							role_id: z.string(),
						}),
					);
					values.boost_3x_roles = plugin.boost_3x_roles || [];
					formFields.push(
						<ArrayField
							key="boost_3x_roles"
							name="boost_3x_roles"
							label="Roles with XP multiplier"
							description="Roles that receive triple XP"
							guildId={guildId}
							arrayType="roles"
						/>,
					);
				}
				break;

			case "welcome":
				if (type === "basic") {
					schemaFields.welcome_channel_id = z.string().optional();
					values.welcome_channel_id = plugin.welcome_channel_id;
					formFields.push(
						<ChannelField
							key="welcome_channel_id"
							name="welcome_channel_id"
							label="Welcome channel"
							description="Channel to send welcome messages to new users"
							guildId={guildId}
						/>,
					);

					schemaFields.leave_channel_id = z.string().optional();
					values.leave_channel_id = plugin.leave_channel_id;
					formFields.push(
						<ChannelField
							key="leave_channel_id"
							name="leave_channel_id"
							label="Leave channel"
							description="Channel to send leave messages to users"
							guildId={guildId}
						/>,
					);

					schemaFields.join_role_id = z.string().optional();
					values.join_role_id = plugin.join_role_id;
					formFields.push(
						<RoleField
							key="join_role_id"
							name="join_role_id"
							label="Welcome role"
							description="Role awarded to new users"
							guildId={guildId}
						/>,
					);
				} else {
					schemaFields.welcome_message = z.string();
					values.welcome_message = plugin.welcome_message;
					formFields.push(
						<MessageField
							key="welcome_message"
							name="welcome_message"
							label="Welcome message"
							description="Custom welcome message. You can use {user}, {server_name} as placeholders."
							multiline={true}
						/>,
					);

					schemaFields.leave_message = z.string();
					values.leave_message = plugin.leave_message;
					formFields.push(
						<MessageField
							key="leave_message"
							name="leave_message"
							label="Leave message"
							description="Custom leave message. You can use {username}, {server_name} as placeholders."
							multiline={true}
						/>,
					);
				}
				break;

			case "starboard":
				if (type === "basic") {
					schemaFields.starboard_channel_id = z.string().optional();
					values.starboard_channel_id = plugin.starboard_channel_id;
					formFields.push(
						<ChannelField
							key="starboard_channel_id"
							name="starboard_channel_id"
							label="Starboard channel"
							description="Channel to send starboard messages"
							guildId={guildId}
						/>,
					);

					schemaFields.starboard_emoji = z.string();
					values.starboard_emoji = plugin.starboard_emoji;
					formFields.push(
						<EmojiField
							key="starboard_emoji"
							name="starboard_emoji"
							label="Starboard emoji"
							description="Emoji to use for starboard messages"
							guildId={guildId}
						/>,
					);
				} else {
					schemaFields.starboard_message = z.string();
					values.starboard_message = plugin.starboard_message;
					formFields.push(
						<MessageField
							key="starboard_message"
							name="starboard_message"
							label="Starboard message"
							description="Custom starboard message. You can use {user}, {message_id} as placeholders."
							multiline={true}
						/>,
					);
				}
				break;
			// Dodaj więcej przypadków dla innych pluginów

			default:
				// Dla nieznanych pluginów wyświetl ogólny formularz JSON
				if (type === "advanced") {
					schemaFields.config = z.string();
					values.config = JSON.stringify(plugin, null, 2);
					formFields.push(
						<TextField
							key="config"
							name="config"
							label="JSON configuration"
							description="Edit the plugin configuration directly in JSON format"
							multiline={true}
						/>,
					);
				}
		}

		if (Object.keys(schemaFields).length > 0) {
			setFormSchema(z.object(schemaFields));
			setDefaultValues(values);
			setFields(formFields);
		}
	}, [plugin, guildId, type]);

	const form = useForm<any>({
		resolver: formSchema ? zodResolver(formSchema) : undefined,
		defaultValues,
	});

	const onSubmit = async (data: any) => {
		// Jeśli to zaawansowana edycja, możemy potrzebować przekształcić dane
		let configToSave = data;

		if (type === "advanced" && data.config && plugin.id === "default") {
			try {
				configToSave = JSON.parse(data.config);
			} catch (e) {
				console.error("Invalid JSON", e);
				return;
			}
		}

		await onSave(configToSave);
	};

	if (!formSchema || fields.length === 0) {
		return (
			<div className="text-center py-4">
				<p className="text-muted-foreground">
					No settings to configure in this section.
				</p>
			</div>
		);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{fields}

				{/* <div className="flex justify-end">
					<Button type="submit" disabled={isSaving}>
						{isSaving ? "Saving..." : "Save changes"}
						{!isSaving && <Save className="size-5" />}
					</Button>
				</div> */}
			</form>
		</Form>
	);
}
