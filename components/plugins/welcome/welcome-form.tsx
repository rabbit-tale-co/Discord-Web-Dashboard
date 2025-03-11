"use client";
/**
 * Welcome Plugin Form Component
 *
 * Form for configuring welcome messages when users join the server.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Colors } from "@/lib/constants/colors";
import React from "react";

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
import { MessageField } from "../fields/message-field";

// Define interfaces for our types
interface EmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

interface EmbedFooter {
	text: string;
}

interface EmbedThumbnail {
	url: string;
}

interface EmbedImage {
	url: string;
}

interface EmbedData {
	color?: number;
	title?: string;
	description?: string;
	fields?: EmbedField[];
	footer?: EmbedFooter;
	thumbnail?: EmbedThumbnail;
	image?: EmbedImage;
}

interface FormValues {
	enabled: boolean;
	type: "embed" | "text";
	welcome_message?: string;
	welcome_channel_id?: string;
	leave_message?: string;
	leave_channel_id?: string;
	join_role_id?: string;
	embed_welcome?: EmbedData;
	embed_leave?: EmbedData;
}

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

interface WelcomeFormProps {
	plugin: WelcomeGoodbye;
}

export function WelcomeForm({ plugin }: WelcomeFormProps) {
	const params = useParams();
	const guildId = params.id as string;
	const [activeSection, setActiveSection] = useState("welcome-message");
	const { guildData } = useGuild(guildId);
	const { refetchPlugins } = usePlugins(
		guildData
			? ({
					id: guildData.id,
					name: guildData.name,
					icon: guildData.guild_details?.icon || undefined,
					roles: guildData.roles || [],
					channels: guildData.channels || [],
					guild_details: guildData.guild_details || {},
					category_count: 0,
					text_channel_count: 0,
					voice_channel_count: 0,
					rolesCount: 0,
					created_at: "",
					features: [],
					premium_tier: 0,
					premium_subscription_count: 0,
					nsfw_level: 0,
					explicit_content_filter: 0,
					system_channel_id: "",
					system_channel_flags: 0,
					region: "",
				} as unknown as GuildData)
			: ({} as GuildData),
	);
	const [isSaving, setIsSaving] = useState(false);
	const [previewEmbed, setPreviewEmbed] = useState<EmbedData | null>(null);
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
			embed_welcome: {
				color: plugin.embed_welcome?.color,
				title: plugin.embed_welcome?.title || "",
				description: plugin.embed_welcome?.description || "",
				fields:
					plugin.embed_welcome?.fields?.map((field) => ({
						name: field.name || "",
						value: field.value || "",
						inline: field.inline,
					})) || [],
				thumbnail: plugin.embed_welcome?.thumbnail
					? {
							url: plugin.embed_welcome.thumbnail.url || "",
						}
					: { url: "" },
				image: plugin.embed_welcome?.image
					? {
							url: plugin.embed_welcome.image.url || "",
						}
					: { url: "" },
				footer: plugin.embed_welcome?.footer
					? {
							text: plugin.embed_welcome.footer.text || "",
						}
					: { text: "" },
			},
			embed_leave: {
				color: plugin.embed_leave?.color,
				title: plugin.embed_leave?.title || "",
				description: plugin.embed_leave?.description || "",
				fields:
					plugin.embed_leave?.fields?.map((field) => ({
						name: field.name || "",
						value: field.value || "",
						inline: field.inline,
					})) || [],
				thumbnail: plugin.embed_leave?.thumbnail
					? {
							url: plugin.embed_leave.thumbnail.url || "",
						}
					: { url: "" },
				image: plugin.embed_leave?.image
					? {
							url: plugin.embed_leave.image.url || "",
						}
					: { url: "" },
				footer: plugin.embed_leave?.footer
					? {
							text: plugin.embed_leave.footer.text || "",
						}
					: { text: "" },
			},
		},
	});

	// Watch all form values for changes
	const formValues = useWatch<FormValues>({
		control: form.control,
	});

	// Update preview when any form field changes
	useEffect(() => {
		if (formValues.type === "embed") {
			const section = activeSection;
			const rawEmbedData =
				section === "welcome-embed"
					? formValues.embed_welcome
					: formValues.embed_leave;

			// Ensure fields have required properties
			const validatedFields =
				rawEmbedData?.fields?.map((field) => ({
					name: field.name || "",
					value: field.value || "",
					inline: field.inline,
				})) || [];

			// Ensure footer, thumbnail and image have required properties
			const validatedFooter = rawEmbedData?.footer
				? {
						text: rawEmbedData.footer.text || "",
					}
				: undefined;

			const validatedThumbnail = rawEmbedData?.thumbnail
				? {
						url: rawEmbedData.thumbnail.url || "",
					}
				: undefined;

			const validatedImage = rawEmbedData?.image
				? {
						url: rawEmbedData.image.url || "",
					}
				: undefined;

			// Create validated embed data
			const previewEmbed: EmbedData = {
				color: rawEmbedData?.color,
				title: rawEmbedData?.title || "",
				description: rawEmbedData?.description || "",
				fields: validatedFields,
				footer: validatedFooter || { text: "" },
				thumbnail: validatedThumbnail || { url: "" },
				image: validatedImage || { url: "" },
			};

			setPreviewEmbed(previewEmbed);
		}
	}, [formValues, activeSection]);

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
				embed_welcome: {
					color: plugin.embed_welcome?.color,
					title: plugin.embed_welcome?.title || "",
					description: plugin.embed_welcome?.description || "",
					fields: plugin.embed_welcome?.fields || [],
					thumbnail: plugin.embed_welcome?.thumbnail || { url: "" },
					image: plugin.embed_welcome?.image || { url: "" },
					footer: plugin.embed_welcome?.footer || { text: "" },
				},
				embed_leave: {
					color: plugin.embed_leave?.color,
					title: plugin.embed_leave?.title || "",
					description: plugin.embed_leave?.description || "",
					fields: plugin.embed_leave?.fields || [],
					thumbnail: plugin.embed_leave?.thumbnail || { url: "" },
					image: plugin.embed_leave?.image || { url: "" },
					footer: plugin.embed_leave?.footer || { text: "" },
				},
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

	// Dodajemy zmienne i kategorie do obiektu window
	useEffect(() => {
		if (typeof window !== "undefined") {
			const windowWithVars = window as unknown as {
				__guildData?: typeof guildData;
				__welcomeVariables?: typeof variables;
				__variableCategories?: typeof categories;
			};

			windowWithVars.__guildData = guildData;
			windowWithVars.__welcomeVariables = variables;
			windowWithVars.__variableCategories = categories;
		}
	}, [guildData, variables, categories]);

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

					<TabsContent
						key="welcome-message-tab"
						value="welcome-message"
						className="space-y-4"
					>
						<MessageField
							name="welcome_message"
							label="Welcome Message"
							description="Message that will be sent to users when they join the server"
							showEmojiPicker={false}
							rows={3}
							maxLength={1000}
							id="welcome-message-field"
						/>
					</TabsContent>

					<TabsContent
						key="leave-message-tab"
						value="leave-message"
						className="space-y-4"
					>
						<MessageField
							name="leave_message"
							label="Leave Message"
							description="Message that will be sent to users when they leave the server"
							showEmojiPicker={false}
							rows={3}
							maxLength={1000}
							id="leave-message-field"
						/>
					</TabsContent>

					<TabsContent
						key="welcome-embed-tab"
						value="welcome-embed"
						className="space-y-4"
					>
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

								<MessageField
									name="embed_welcome.title"
									label="Title"
									description="The title of your welcome embed"
									showEmojiPicker={false}
									rows={1}
									maxLength={100}
									id="welcome-embed-title-field"
								/>

								<MessageField
									name="embed_welcome.description"
									label="Description"
									description="The main content of your welcome embed"
									showEmojiPicker={false}
									rows={4}
									maxLength={500}
									id="welcome-embed-description-field"
								/>

								<FormField
									control={form.control}
									name="embed_welcome.thumbnail.url"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Thumbnail URL</FormLabel>
											<FormDescription>
												Enter the URL for the thumbnail image
											</FormDescription>
											<FormControl>
												<MentionTextarea
													value={field.value || ""}
													onChange={field.onChange}
													variables={variables}
													categories={categories}
													placeholder="Enter URL or use {server_image}, {bot_avatar}"
													singleLine
													id="welcome-embed-thumbnail-field"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<MessageField
									name="embed_welcome.footer.text"
									label="Footer"
									description="Text that appears at the bottom of the welcome embed"
									showEmojiPicker={false}
									singleLine
									maxLength={100}
									id="welcome-embed-footer-field"
								/>

								<EmbedFieldsEditor
									name="embed_welcome.fields"
									label="Fields"
									description="Add fields to your welcome embed"
									id="welcome-embed-fields"
								/>
							</div>

							<div className="sticky top-4">
								<EmbedPreview
									embed={formValues.type === "embed" ? previewEmbed : null}
									guildData={
										{
											id: guildData?.id || "",
											name: guildData?.name || "",
											icon: guildData?.guild_details?.icon || undefined,
											roles: guildData?.roles || [],
											channels: guildData?.channels || [],
											guild_details: guildData?.guild_details || {},
											category_count: 0,
											text_channel_count: 0,
											voice_channel_count: 0,
											rolesCount: 0,
											created_at: "",
											features: [],
											premium_tier: 0,
											premium_subscription_count: 0,
											nsfw_level: 0,
											explicit_content_filter: 0,
											system_channel_id: "",
											system_channel_flags: 0,
										} as unknown as GuildData
									}
								/>
							</div>
						</div>
					</TabsContent>

					<TabsContent
						key="leave-embed-tab"
						value="leave-embed"
						className="space-y-4"
					>
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
													singleLine={false}
													id="leave-embed-title-field"
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
													placeholder="We're sad to see you go!"
													maxLength={500}
													rows={4}
													id="leave-embed-description-field"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="embed_leave.thumbnail.url"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Thumbnail URL</FormLabel>
											<FormDescription>
												Enter the URL for the thumbnail image
											</FormDescription>
											<FormControl>
												<MentionTextarea
													value={field.value || ""}
													onChange={field.onChange}
													variables={variables}
													categories={categories}
													placeholder="Enter URL or use {server_image}, {bot_avatar}"
													singleLine
													id="leave-embed-thumbnail-field"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
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
													placeholder="Come back soon!"
													maxLength={100}
													singleLine
													id="leave-embed-footer-field"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<EmbedFieldsEditor
									name="embed_leave.fields"
									label="Fields"
									description="Add fields to your leave embed"
									id="leave-embed-fields"
								/>
							</div>

							<div className="sticky top-4">
								<EmbedPreview
									embed={formValues.type === "embed" ? previewEmbed : null}
									guildData={
										{
											id: guildData?.id || "",
											name: guildData?.name || "",
											icon: guildData?.guild_details?.icon || undefined,
											roles: guildData?.roles || [],
											channels: guildData?.channels || [],
											guild_details: guildData?.guild_details || {},
											category_count: 0,
											text_channel_count: 0,
											voice_channel_count: 0,
											rolesCount: 0,
											created_at: "",
											features: [],
											premium_tier: 0,
											premium_subscription_count: 0,
											nsfw_level: 0,
											explicit_content_filter: 0,
											system_channel_id: "",
											system_channel_flags: 0,
											region: "",
										} as unknown as GuildData
									}
								/>
							</div>
						</div>
					</TabsContent>

					<TabsContent
						key="channels-tab"
						value="channels"
						className="space-y-4"
					>
						<div className="grid grid-cols-2 gap-6">
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
						</div>
					</TabsContent>

					<TabsContent key="roles-tab" value="roles" className="space-y-4">
						<div className="grid grid-cols-2 gap-6">
							<RoleField
								name="join_role_id"
								label="Join Role"
								description="Role that will be added to users when they join"
								guildId={guildId}
							/>
						</div>
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
