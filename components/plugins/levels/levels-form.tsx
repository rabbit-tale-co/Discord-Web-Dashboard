"use client";
/**
 * Levels Plugin Form Component
 *
 * A specific form for configuring the Levels plugin settings.
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { type Level, usePlugins } from "@/hooks/use-plugins";
import type { Variable } from "@/components/ui/mention/mention-popover";
import { combineVariables, combineCategories } from "@/lib/variables";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { MentionTextarea } from "@/components/ui/mention/mention-textarea";
import { type GuildData, useGuild } from "@/hooks/use-guilds";
import { toast } from "sonner";
import { ChannelField } from "../fields/channel-field";
import { LevelRolesField } from "../fields/level-roles-field";
import { useParams } from "next/navigation";

// Define the form schema
const formSchema = z.object({
	enabled: z.boolean().default(false),
	reward_message: z.string().default(""),
	channel_id: z.string().default(""),
	enable_role_rewards: z.boolean().default(false),
	role_rewards: z
		.array(
			z.object({
				level: z.number().min(0),
				roleId: z.string(),
			}),
		)
		.default([]),
	boost_3x_roles: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface LevelsFormProps {
	plugin: Level;
}

export function LevelsForm({ plugin }: LevelsFormProps) {
	const params = useParams();
	const guildId = params.id as string;
	const [activeTab, setActiveTab] = useState("general");
	const { guildData } = useGuild(guildId);
	const [isSaving, setIsSaving] = useState(false);
	const { refetchPlugins } = usePlugins(guildData as GuildData);

	// Initialize the form with plugin config
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			enabled: Boolean(plugin.enabled),
			reward_message: plugin.reward_message,
			channel_id: plugin.channel_id,
			enable_role_rewards: plugin.reward_roles?.length > 0,
			role_rewards:
				plugin.reward_roles?.map((role) => ({
					level: role.level,
					roleId: role.role_id,
				})) || [],
			boost_3x_roles: Array.isArray(plugin.boost_3x_roles)
				? plugin.boost_3x_roles
				: [],
		},
	});

	// Update form values when plugin data changes
	useEffect(() => {
		if (plugin) {
			const values: FormValues = {
				enabled: Boolean(plugin.enabled),
				reward_message: plugin.reward_message,
				channel_id: plugin.channel_id,
				enable_role_rewards:
					Array.isArray(plugin.reward_roles) && plugin.reward_roles.length > 0,
				role_rewards:
					plugin.reward_roles?.map((role) => ({
						level: role.level,
						roleId: role.role_id,
					})) || [],
				boost_3x_roles: Array.isArray(plugin.boost_3x_roles)
					? plugin.boost_3x_roles
					: [],
			};
			form.reset(values);
		}
	}, [plugin, form.reset]);

	// Set guild data in window object for mention textarea
	useEffect(() => {
		if (guildData && typeof window !== "undefined") {
			(window as unknown as { __guildData?: typeof guildData }).__guildData =
				guildData;
		}
	}, [guildData]);

	// Plugin-specific variables
	const levelVariables: Variable[] = [
		{
			id: "level",
			name: "level",
			description: "Level reached",
			category: "Level",
		},
	];

	// Plugin-specific categories
	const levelCategories = [{ id: "level", name: "Level", icon: "⭐" }];

	// Combine global and plugin-specific variables and categories
	const variables = combineVariables(levelVariables);
	const categories = combineCategories(levelCategories);

	// Handle form submission
	const handleSubmit = async (values: FormValues) => {
		setIsSaving(true);
		try {
			const bot_id = process.env.NEXT_PUBLIC_BOT_ID;
			if (!bot_id) {
				throw new Error("Bot ID not configured");
			}

			// Convert mentions to proper Discord format
			const processMessage = (message: string) => {
				// Create a temporary DOM element to parse the HTML
				const tempDiv = document.createElement("div");
				tempDiv.innerHTML = message;

				// Extract the text content and mentions
				let processedMessage = "";
				const walkNodes = (node: Node) => {
					if (node.nodeType === Node.ELEMENT_NODE) {
						const element = node as HTMLElement;
						if (
							element.hasAttribute("data-type") &&
							element.hasAttribute("data-value")
						) {
							// This is a mention element, use its data-value
							const value = element.getAttribute("data-value");
							processedMessage += value;
						} else {
							// Recursively process child nodes
							element.childNodes.forEach(walkNodes);
						}
					} else if (node.nodeType === Node.TEXT_NODE) {
						// This is a text node, add its content
						processedMessage += node.textContent;
					}
				};

				walkNodes(tempDiv);

				// Clean up the message
				processedMessage = processedMessage.trim();

				return processedMessage;
			};

			const configData = {
				...values,
				reward_message: processMessage(values.reward_message),
				channel_id: values.channel_id,
				role_rewards: values.enable_role_rewards
					? values.role_rewards.map((role) => ({
							level: role.level,
							role_id: role.roleId,
						}))
					: [],
				boost_3x_roles: Array.isArray(values.boost_3x_roles)
					? values.boost_3x_roles
					: [],
			};

			const response = await fetch("/api/plugins/set", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					bot_id,
					guild_id: guildId,
					plugin_id: "levels",
					plugin_name: "Levels",
					config: configData,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || "Failed to save configuration");
			}

			// Update the form with new values but keep the readable format for the UI
			form.reset(values);

			toast.success("Configuration saved", {
				description: "The plugin configuration has been updated successfully.",
			});

			// Refresh plugin data
			await refetchPlugins();
		} catch (error) {
			console.error("Error saving config:", error);
			toast.error("Failed to save configuration", {
				description:
					error instanceof Error
						? error.message
						: "Please try again later or contact support.",
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList className="grid grid-cols-2 mb-4">
						<TabsTrigger value="general">General</TabsTrigger>
						<TabsTrigger value="roles">Role Rewards</TabsTrigger>
					</TabsList>

					<TabsContent value="general" className="space-y-4">
						<FormField
							control={form.control}
							name="reward_message"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Level Up Message</FormLabel>
									<FormDescription>
										The message sent when a user levels up. Use variables like{" "}
										{"{user}"} and {"{level}"}.
									</FormDescription>
									<FormControl>
										<MentionTextarea
											value={field.value || ""}
											onChange={field.onChange}
											variables={variables}
											categories={categories}
											placeholder="Congratulations {user}, you've reached level {level}!"
											roles={guildData?.roles || []}
											channels={guildData?.channels || []}
											maxLength={500}
											rows={3}
											showEmojiPicker={false}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<ChannelField
							guildId={guildId}
							name="channel_id"
							label="Level Up Channel"
							description="Channel where level up messages will be sent. Leave empty to use the channel where the user was active."
						/>
					</TabsContent>

					<TabsContent value="roles" className="space-y-4">
						<FormField
							control={form.control}
							name="enable_role_rewards"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">
											Enable Role Rewards
										</FormLabel>
										<FormDescription>
											Give roles to users when they reach specific levels
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						{form.watch("enable_role_rewards") && (
							<div className="space-y-4">
								<LevelRolesField
									name="role_rewards"
									label="Role Rewards"
									description="Configure roles that users will receive when reaching specific levels"
									roles={guildData?.roles || []}
								/>
							</div>
						)}

						<LevelRolesField
							name="boost_3x_roles"
							label="Boost 3x XP Roles"
							description="Roles that will receive 3x XP when the user has a boost active"
							roles={guildData?.roles || []}
							showLevel={false}
						/>
					</TabsContent>
				</Tabs>

				<CardFooter className="px-0 pb-0">
					<div className="flex justify-end">
						<Button size="lg" type="submit" disabled={isSaving}>
							{isSaving ? "Saving..." : "Save changes"}
						</Button>
					</div>
				</CardFooter>
			</form>
		</Form>
	);
}
