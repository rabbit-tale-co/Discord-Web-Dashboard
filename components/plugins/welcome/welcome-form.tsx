"use client";
/**
 * Welcome Plugin Form Component
 *
 * Form for configuring welcome messages when users join the server.
 */

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Colors } from "@/lib/constants/colors";

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
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { MentionTextarea } from "@/components/ui/mention/mention-textarea";
import { type GuildData, useGuild } from "@/hooks/use-guilds";
import { combineCategories, combineVariables } from "@/lib/variables";
import { useParams, useRouter } from "next/navigation";
import type { Variable } from "@/components/ui/mention";
import { usePlugins, type WelcomeGoodbye } from "@/hooks/use-plugins";
import { ChannelField } from "../fields/channel-field";
import { getUser } from "@/hooks/use-user";
import avatarUrl from "@/lib/is-gif";
import { EmbedFieldsEditor } from "../fields/embed-fields-editor";
import { EmbedPreview } from "../fields/embed-preview";
import { RoleField } from "../fields/role-field";
import { ColorPicker } from "../fields/color-picker";
import type { User } from "discord.js";

// Define the form schema
const formSchema = z.object({
	enabled: z.boolean().default(false),
	type: z.enum(["embed", "text"]).default("text"),
	welcome_message: z.string().optional(),
	welcome_channel_id: z.string().optional(),
	leave_message: z.string().optional(),
	leave_channel_id: z.string().optional(),
	join_role_id: z.string().optional(),
	embed_welcome: z
		.object({
			color: z.number().optional(),
			title: z.string().optional(),
			description: z.string().optional(),
			fields: z
				.array(
					z.object({
						name: z.string(),
						value: z.string(),
						inline: z.boolean().optional(),
					}),
				)
				.optional(),
			footer: z
				.object({
					text: z.string(),
				})
				.optional(),
			thumbnail: z
				.object({
					url: z.string(),
				})
				.optional(),
			image: z
				.object({
					url: z.string(),
				})
				.optional(),
		})
		.optional(),
	embed_leave: z
		.object({
			color: z.number().optional(),
			title: z.string().optional(),
			description: z.string().optional(),
			fields: z
				.array(
					z.object({
						name: z.string(),
						value: z.string(),
						inline: z.boolean().optional(),
					}),
				)
				.optional(),
			footer: z
				.object({
					text: z.string(),
				})
				.optional(),
			thumbnail: z
				.object({
					url: z.string(),
				})
				.optional(),
			image: z
				.object({
					url: z.string(),
				})
				.optional(),
		})
		.optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface WelcomeFormProps {
	plugin: WelcomeGoodbye;
}

export function WelcomeForm({ plugin }: WelcomeFormProps) {
	const params = useParams();
	const guildId = params.id as string;
	const [activeSection, setActiveSection] = useState("welcome-message");
	const { guildData } = useGuild(guildId);
	const { refetchPlugins } = usePlugins(guildData as GuildData);
	const [isSaving, setIsSaving] = useState(false);
	const [previewEmbed, setPreviewEmbed] = useState<NonNullable<
		FormValues["embed_welcome"] | FormValues["embed_leave"]
	> | null>(null);
	const [user, setUser] = useState<User | null>(null);

	// Fetch user data on component mount
	useEffect(() => {
		const fetchUser = async () => {
			try {
				const userData = await getUser(
					process.env.NEXT_PUBLIC_BOT_ID as string,
				);
				setUser(userData);
			} catch (error) {
				console.error("Error fetching user:", error);
			}
		};
		fetchUser();
	}, []);

	// Initialize the form with plugin config
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			enabled: plugin.enabled ?? false,
			type: plugin.type,
			welcome_message: plugin.welcome_message,
			welcome_channel_id: plugin.welcome_channel_id,
			leave_message: plugin.leave_message,
			leave_channel_id: plugin.leave_channel_id,
			join_role_id: plugin.join_role_id,
			embed_welcome: plugin.embed_welcome,
			embed_leave: plugin.embed_leave,
		},
	});

	// Add helper function to replace variables with useCallback
	const replaceVariables = useCallback(
		(text?: string) => {
			if (!text) return "";
			console.log("replaceVariables user:", user);
			return text
				.replace(/{username}/g, user?.username || "Bot")
				.replace(/{user}/g, `<@${user?.id}>` || "@User")
				.replace(/{server}/g, guildData?.name || "Server")
				.replace(/{server_name}/g, guildData?.name || "Server")
				.replace(/{server_image}/g, guildData?.guild_details?.icon || "")
				.replace(
					/{avatar}/g,
					user?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png",
				)
				.replace(
					/{user_avatar}/g,
					user?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png",
				)
				.replace(
					/{server_avatar}/g,
					guildData?.guild_details?.icon ||
						"https://cdn.discordapp.com/embed/avatars/1.png",
				);
		},
		[user, guildData],
	);

	// Update preview when embed fields change
	useEffect(() => {
		if (form.watch("type") === "embed") {
			const section = activeSection;
			const embedData =
				section === "welcome-embed"
					? form.watch("embed_welcome")
					: form.watch("embed_leave");

			if (embedData) {
				// Replace variables in preview
				const previewData = {
					...embedData,
					title: replaceVariables(embedData.title),
					description: replaceVariables(embedData.description),
					fields: embedData.fields?.map((field) => ({
						...field,
						name: replaceVariables(field.name),
						value: replaceVariables(field.value),
					})),
					footer: embedData.footer
						? {
								...embedData.footer,
								text: replaceVariables(embedData.footer.text),
							}
						: undefined,
					thumbnail: embedData.thumbnail
						? {
								...embedData.thumbnail,
								url: replaceVariables(embedData.thumbnail.url),
							}
						: undefined,
					image: embedData.image
						? {
								...embedData.image,
								url: replaceVariables(embedData.image.url),
							}
						: undefined,
				};
				setPreviewEmbed(previewData);
			} else {
				setPreviewEmbed(null);
			}
		}
	}, [form.watch, activeSection, replaceVariables]);

	// Update form values when plugin data changes
	useEffect(() => {
		if (plugin) {
			const values: FormValues = {
				enabled: plugin.enabled ?? false,
				type: plugin.type,
				welcome_message: plugin.welcome_message,
				welcome_channel_id: plugin.welcome_channel_id,
				leave_message: plugin.leave_message,
				leave_channel_id: plugin.leave_channel_id,
				join_role_id: plugin.join_role_id,
				embed_welcome: plugin.embed_welcome,
				embed_leave: plugin.embed_leave,
			};
			form.reset(values);
		}
	}, [plugin, form.reset]);

	useEffect(() => {
		if (guildData && typeof window !== "undefined") {
			(window as unknown as { __guildData?: typeof guildData }).__guildData =
				guildData;
		}
	}, [guildData]);

	const welcomeVariables: Variable[] = [];
	const welcomeCategories = [{ id: "welcome", name: "Welcome", icon: "👋" }];

	const variables = combineVariables(welcomeVariables);
	const categories = combineCategories(welcomeCategories);

	// Handle form submission
	const handleSubmit = async (values: FormValues) => {
		setIsSaving(true);
		try {
			const bot_id = process.env.NEXT_PUBLIC_BOT_ID;
			if (!bot_id) {
				throw new Error("Bot ID not configured");
			}

			const configData = {
				...values,
				welcome_message: values.welcome_message,
				welcome_channel_id: values.welcome_channel_id,
				leave_message: values.leave_message,
				leave_channel_id: values.leave_channel_id,
				join_role_id: values.join_role_id,
				embed_welcome: values.embed_welcome,
				embed_leave: values.embed_leave,
			};

			const response = await fetch("/api/plugins/set", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					bot_id,
					guild_id: guildId,
					plugin_id: "welcome_goodbye",
					plugin_name: "Welcome & Goodbye",
					config: configData,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || "Failed to save configuration");
			}

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
				<FormField
					control={form.control}
					name="enabled"
					render={({ field }) => (
						<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
							<div className="space-y-0.5">
								<FormLabel className="text-base">
									Enable Welcome & Goodbye
								</FormLabel>
								<FormDescription>
									Activate welcome and goodbye messages for your server
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

				<FormField
					control={form.control}
					name="type"
					render={({ field }) => (
						<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
							<div className="space-y-0.5">
								<FormLabel className="text-base">Message Type</FormLabel>
								<FormDescription>
									Choose between simple text messages or rich embeds
								</FormDescription>
							</div>
							<div className="flex items-center space-x-2">
								<FormLabel className="text-sm">Text</FormLabel>
								<FormControl>
									<Switch
										checked={field.value === "embed"}
										onCheckedChange={(checked) => {
											field.onChange(checked ? "embed" : "text");
										}}
									/>
								</FormControl>
								<FormLabel className="text-sm">Embed</FormLabel>
							</div>
						</FormItem>
					)}
				/>

				<Tabs value={activeSection} onValueChange={setActiveSection}>
					<TabsList className="grid w-full grid-cols-6">
						<TabsTrigger value="welcome-message">Welcome Message</TabsTrigger>
						<TabsTrigger value="leave-message">Leave Message</TabsTrigger>
						<TabsTrigger value="welcome-embed">Welcome Embed</TabsTrigger>
						<TabsTrigger value="leave-embed">Leave Embed</TabsTrigger>
						<TabsTrigger value="channels">Channels</TabsTrigger>
						<TabsTrigger value="roles">Roles</TabsTrigger>
					</TabsList>

					<TabsContent value="welcome-message" className="space-y-4">
						<FormField
							control={form.control}
							name="welcome_message"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Welcome Message</FormLabel>
									<FormDescription>
										The message sent when a user joins. Use variables like{" "}
										{"{user}"}, {"{server}"}, {"{server_name}"}, {"{username}"},{" "}
										{"{server_image}"}, and {"{avatar}"}.
									</FormDescription>
									<FormControl>
										<MentionTextarea
											value={field.value || ""}
											onChange={field.onChange}
											variables={variables}
											categories={categories}
											placeholder="Welcome {user} to {server}!"
											roles={guildData?.roles || []}
											channels={guildData?.channels || []}
											maxLength={2000}
											rows={5}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</TabsContent>

					<TabsContent value="leave-message" className="space-y-4">
						<FormField
							control={form.control}
							name="leave_message"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Leave Message</FormLabel>
									<FormDescription>
										The message sent when a user leaves. Use variables like{" "}
										{"{user}"}, {"{server}"}, {"{server_name}"}, {"{username}"},{" "}
										{"{server_image}"}, and {"{avatar}"}.
									</FormDescription>
									<FormControl>
										<MentionTextarea
											value={field.value || ""}
											onChange={field.onChange}
											variables={variables}
											categories={categories}
											placeholder="Goodbye {user} from {server}!"
											roles={guildData?.roles || []}
											channels={guildData?.channels || []}
											maxLength={2000}
											rows={3}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</TabsContent>

					<TabsContent value="welcome-embed" className="space-y-4">
						<div className="grid grid-cols-2 gap-6">
							<div className="space-y-4">
								<FormField
									control={form.control}
									name="embed_welcome.color"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Color</FormLabel>
											<FormDescription>
												Choose the color of your welcome embed
											</FormDescription>
											<FormControl>
												<ColorPicker
													value={field.value || Colors.Blurple}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="embed_welcome.title"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Title</FormLabel>
											<FormDescription>The title of your embed</FormDescription>
											<FormControl>
												<MentionTextarea
													value={field.value || ""}
													onChange={field.onChange}
													variables={variables}
													categories={categories}
													placeholder="Welcome to {server}!"
													maxLength={100}
													rows={1}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="embed_welcome.description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Description</FormLabel>
											<FormDescription>
												The main content of your welcome embed
											</FormDescription>
											<FormControl>
												<MentionTextarea
													value={field.value || ""}
													onChange={field.onChange}
													variables={variables}
													categories={categories}
													placeholder="Hey {user}, welcome to our community!"
													maxLength={500}
													rows={4}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="embed_welcome.fields"
									render={() => (
										<EmbedFieldsEditor
											name="embed_welcome.fields"
											label="Fields"
											description="Add fields to your welcome embed"
										/>
									)}
								/>

								<FormField
									control={form.control}
									name="embed_welcome.footer.text"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Footer</FormLabel>
											<FormDescription>
												Text that appears at the bottom of the welcome embed
											</FormDescription>
											<FormControl>
												<MentionTextarea
													value={field.value || ""}
													onChange={field.onChange}
													variables={variables}
													categories={categories}
													placeholder="Enjoy your stay!"
													maxLength={100}
													rows={1}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="sticky top-4">
								<EmbedPreview
									embed={previewEmbed}
									guildData={guildData as GuildData}
								/>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="leave-embed" className="space-y-4">
						<div className="grid grid-cols-2 gap-6">
							<div className="space-y-4">
								<FormField
									control={form.control}
									name="embed_leave.color"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Color</FormLabel>
											<FormDescription>
												Choose the color of your leave embed
											</FormDescription>
											<FormControl>
												<ColorPicker
													value={field.value || Colors.Red}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="embed_leave.title"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Title</FormLabel>
											<FormDescription>
												The title of your leave embed
											</FormDescription>
											<FormControl>
												<MentionTextarea
													value={field.value || ""}
													onChange={field.onChange}
													variables={variables}
													categories={categories}
													placeholder="Goodbye from {server}!"
													maxLength={100}
													rows={1}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="embed_leave.description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Description</FormLabel>
											<FormDescription>
												The main content of your leave embed
											</FormDescription>
											<FormControl>
												<MentionTextarea
													value={field.value || ""}
													onChange={field.onChange}
													variables={variables}
													categories={categories}
													placeholder="{user} has left the server."
													maxLength={500}
													rows={4}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="embed_leave.fields"
									render={() => (
										<EmbedFieldsEditor
											name="embed_leave.fields"
											label="Fields"
											description="Add fields to your leave embed"
										/>
									)}
								/>

								<FormField
									control={form.control}
									name="embed_leave.footer.text"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Footer</FormLabel>
											<FormDescription>
												Text that appears at the bottom of the leave embed
											</FormDescription>
											<FormControl>
												<MentionTextarea
													value={field.value || ""}
													onChange={field.onChange}
													variables={variables}
													categories={categories}
													placeholder="We hope to see you again!"
													maxLength={100}
													rows={1}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="sticky top-4">
								<EmbedPreview
									embed={form.watch("type") === "embed" ? previewEmbed : null}
									guildData={guildData as GuildData}
								/>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="channels" className="space-y-4">
						<ChannelField
							name="welcome_channel_id"
							label="Welcome Channel"
							description="Channel where welcome messages will be sent"
							guildId={guildId}
						/>

						<ChannelField
							name="leave_channel_id"
							label="Leave Channel"
							description="Channel where leave messages will be sent"
							guildId={guildId}
						/>
					</TabsContent>

					<TabsContent value="roles" className="space-y-4">
						<RoleField
							name="join_role_id"
							label="Join Role"
							description="Role that will be added to users when they join"
							guildId={guildId}
						/>
					</TabsContent>
				</Tabs>

				<CardFooter className="px-0 pb-0">
					<Button size="lg" type="submit" disabled={isSaving}>
						{isSaving ? "Saving..." : "Save Changes"}
					</Button>
				</CardFooter>
			</form>
		</Form>
	);
}
