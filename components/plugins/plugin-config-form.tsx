"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import type { Plugin } from "@/hooks/use-plugins";
import { FormField, FormItem, FormControl } from "@/components/ui/form";

// Import naszych komponentów pól formularza
import { ChannelField } from "./fields/channel-field";
import { RoleField } from "./fields/role-field";
import { ArrayField } from "./fields/array-field";
import { MessageField } from "./fields/message-field";
import { toast as sonnerToast } from "sonner";
import { MentionTextarea } from "@/components/ui/textarea";
import { EyeIcon } from "lucide-react";
import { EmbedFieldsEditor } from "./fields/embed-fields-editor";

type PluginConfigFormProps = {
	plugin: Plugin;
	guildId: string;
};

const UNSAVED_KEY = (pluginId: string) => `unsaved-plugin-${pluginId}`;

interface FormToastProps {
	id: string | number;
	message: string;
	onSave: () => void;
	onReset: () => void;
}

// Discord Embed Preview Component
interface DiscordEmbedPreviewProps {
	embed: {
		title?: string;
		description?: string;
		color?: string;
		thumbnail?: {
			url?: string;
		};
		image?: {
			url?: string;
		};
		footer?: {
			text?: string;
			iconURL?: string;
		};
		fields?: {
			name: string;
			value: string;
			inline: boolean;
			_id?: string;
		}[];
	};
	author?: {
		name: string;
		iconURL?: string;
	};
}

function DiscordEmbedPreview({ embed, author }: DiscordEmbedPreviewProps) {
	// Convert hex color to Discord's format if needed
	const embedColor = useMemo(() => {
		if (!embed.color) return "#5865F2"; // Discord Blurple as default

		// If it's a number, convert to hex
		if (!Number.isNaN(Number(embed.color))) {
			const colorInt = Number.parseInt(embed.color, 10);
			return `#${colorInt.toString(16).padStart(6, "0")}`;
		}

		// If it starts with #, use as is
		if (embed.color.startsWith("#")) {
			return embed.color;
		}

		// Otherwise, assume it's a hex color without #
		return `#${embed.color}`;
	}, [embed.color]);

	// Funkcja pomocnicza do bezpiecznego renderowania tekstu
	const renderText = (text: string | undefined) => {
		if (!text) return null;

		// Strip out Slate HTML and data attributes
		let processed = text
			// Remove slate data attributes and elements
			.replace(/<[^>]*data-slate[^>]*>(.*?)<\/[^>]*>/g, "$1")
			.replace(/<[^>]*data-slate[^>]*>/g, "")
			.replace(/<\/[^>]*>/g, "")
			.replace(/data-slate[^=]*="[^"]*"/g, "")
			// Clean up any remaining HTML tags
			.replace(/<[^>]*>/g, "");

		// Zastąp zmienne templatu ich reprezentacją wizualną
		processed = processed
			.replace(/{server_name}/g, "Server Name")
			.replace(/{server}/g, "Server Name")
			.replace(/{user}/g, "@User")
			.replace(/{username}/g, "Username")
			.replace(/{memberCount}/g, "123");

		return processed;
	};

	return (
		<div className="mt-4 max-w-[520px] rounded-md bg-[#313338] p-4 text-white">
			<div className="mb-2 text-xs text-gray-300">Embed Preview</div>

			<div className="flex items-start space-x-2">
				{/* Left border with color */}
				<div
					className="w-1 self-stretch rounded-l-md"
					style={{ backgroundColor: embedColor }}
				/>

				{/* Content container */}
				<div className="flex-1 overflow-hidden">
					{/* Author */}
					{author?.name && (
						<div className="mb-1 flex items-center">
							{author.iconURL && (
								<img
									src={author.iconURL}
									alt="Author avatar"
									className="mr-2 h-6 w-6 rounded-full"
								/>
							)}
							<span className="text-sm font-medium">
								{renderText(author.name)}
							</span>
						</div>
					)}

					{/* Title */}
					{embed.title && (
						<div className="mb-1 text-base font-semibold text-white">
							{renderText(embed.title)}
						</div>
					)}

					{/* Description */}
					{embed.description && (
						<div className="mb-2 whitespace-pre-wrap text-sm text-gray-200">
							{renderText(embed.description)}
						</div>
					)}

					{/* Fields - render fields if they exist */}
					{embed.fields && embed.fields.length > 0 && (
						<div className="mb-2 grid grid-cols-1 gap-2">
							{embed.fields.map((field, idx) => (
								<div
									key={`embed-field-${field._id || idx}`}
									className={`field ${field.inline ? "inline" : "block"}`}
								>
									{field.name && (
										<div className="font-semibold text-white">
											{renderText(field.name)}
										</div>
									)}
									{field.value && (
										<div className="text-sm text-gray-200">
											{renderText(field.value)}
										</div>
									)}
								</div>
							))}
						</div>
					)}

					{/* Image */}
					{embed.image?.url && (
						<div className="mb-2 mt-2 overflow-hidden rounded">
							<img
								src={embed.image.url}
								alt="Embed content"
								className="max-h-[300px] max-w-full object-cover"
							/>
						</div>
					)}

					{/* Thumbnail */}
					{embed.thumbnail?.url && (
						<div className="absolute right-0 top-0 h-20 w-20 overflow-hidden rounded">
							<img
								src={embed.thumbnail.url}
								alt="Embed thumbnail"
								className="h-full w-full object-cover"
							/>
						</div>
					)}

					{/* Footer */}
					{embed.footer?.text && (
						<div className="mt-2 flex items-center text-xs text-gray-300">
							{embed.footer.iconURL && (
								<img
									src={embed.footer.iconURL}
									alt="Footer icon"
									className="mr-2 h-5 w-5 rounded-full"
								/>
							)}
							{renderText(embed.footer.text)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

/** Custom toast component for form changes */
function FormToast({ id, message, onSave, onReset }: FormToastProps) {
	return (
		<div className="flex rounded-lg bg-white shadow-lg ring-1 ring-black/5 w-full md:max-w-[500px] items-center p-4 dark:bg-[#161615]">
			<div className="flex flex-1 items-center">
				<div className="w-full">
					<p className="text-sm font-medium text-gray-900 dark:text-white">
						{message}
					</p>
				</div>
			</div>
			<div className="flex gap-2 ml-5">
				<button
					type="button"
					className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
					onClick={() => {
						onReset();
						sonnerToast.dismiss(id);
					}}
				>
					Reset
				</button>
				<button
					type="button"
					className="rounded bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800"
					onClick={() => {
						onSave();
						// Don't dismiss here as the save action will handle the dismissal
					}}
				>
					Save changes
				</button>
			</div>
		</div>
	);
}

/** Custom toast function for form changes */
function showFormToast(props: Omit<FormToastProps, "id">) {
	return sonnerToast.custom(
		(id) => (
			<FormToast
				id={id}
				message={props.message}
				onSave={props.onSave}
				onReset={props.onReset}
			/>
		),
		{
			duration: Number.POSITIVE_INFINITY,
			className: "form-toast",
		},
	);
}

// Interface for Guild Data
interface GuildData {
	roles?: { id: string; name: string; color?: number }[];
	channels?: { id: string; name: string; type?: number }[];
}

// Extend window to store guild data
interface WindowWithGuildData extends Window {
	__guildData?: GuildData;
}

export function PluginConfigForm({ plugin, guildId }: PluginConfigFormProps) {
	type FormValues = Record<string, unknown>;

	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	// Refs for toast notifications and first render control
	const toastIdRef = useRef<string | number | null>(null);
	const initialRenderRef = useRef(true);
	const hasShownToastRef = useRef(false);
	const prevPluginIdRef = useRef<string | null>(null);

	// Ref holding initial saved values for comparison
	const initialSavedValuesRef = useRef<Record<string, unknown>>({});

	// Guild data for roles and channels
	const [guildData, setGuildData] = useState<GuildData | null>(null);
	const [loading, setLoading] = useState(false);

	// Add the missing refs
	const savingRef = useRef(false);

	// Prepare schema and initial values without form components
	const prepareFormConfig = () => {
		const schemaFields: Record<string, z.ZodTypeAny> = {};
		const values: Record<string, unknown> = {};

		// Get values from plugin
		for (const key of Object.keys(plugin)) {
			if (key !== "id" && key !== "name" && key !== "description") {
				values[key] = plugin[key as keyof Plugin] ?? "";
			}
		}

		// Combine any unsaved changes with localStorage
		try {
			const unsaved = localStorage.getItem(UNSAVED_KEY(plugin.id));
			if (unsaved) {
				const parsed = JSON.parse(unsaved);
				Object.assign(values, parsed);
			}
		} catch (error) {
			console.error("Error parsing unsaved changes:", error);
		}

		// Define schema fields based on plugin
		switch (plugin.id) {
			case "levels":
				schemaFields.channel_id = z.string().optional();
				values.channel_id = plugin.channel_id ?? "";
				schemaFields.reward_message = z.string().optional().default("");
				values.reward_message = plugin.reward_message ?? "";
				schemaFields.reward_roles = z
					.array(
						z.object({
							level: z.coerce.number().default(0),
							role_id: z.string(),
						}),
					)
					.default([]);
				values.reward_roles = plugin.reward_roles ?? [];
				schemaFields.boost_3x_roles = z.array(
					z.object({
						role_id: z.string(),
					}),
				);
				values.boost_3x_roles = plugin.boost_3x_roles ?? [];
				break;
			case "welcome_goodbye":
				// Enable toggle
				schemaFields.enabled = z.boolean().default(true);
				values.enabled = plugin.enabled ?? true;

				// Type select
				schemaFields.type = z.enum(["embed", "text"]).default("embed");
				values.type = plugin.type ?? "embed";

				// Welcome channel
				schemaFields.welcome_channel_id = z.string().optional();
				values.welcome_channel_id = plugin.welcome_channel_id ?? "";

				// Leave channel
				schemaFields.leave_channel_id = z.string().optional();
				values.leave_channel_id = plugin.leave_channel_id ?? "";

				// Join role
				schemaFields.join_role_id = z.string().optional();
				values.join_role_id = plugin.join_role_id ?? "";

				// Welcome message
				schemaFields.welcome_message = z.string().optional().default("");
				values.welcome_message = plugin.welcome_message ?? "";

				// Leave message
				schemaFields.leave_message = z.string().optional().default("");
				values.leave_message = plugin.leave_message ?? "";

				// Welcome Embed
				schemaFields.embed_welcome = z
					.object({
						color: z.string().optional(),
						title: z.string().optional(),
						description: z.string().optional(),
						fields: z
							.array(
								z.object({
									name: z.string().optional().default(""),
									value: z.string().optional().default(""),
									inline: z.boolean().optional().default(false),
								}),
							)
							.optional()
							.default([]),
						thumbnail: z
							.object({
								url: z.string().optional(),
							})
							.optional(),
						image: z
							.object({
								url: z.string().optional(),
							})
							.optional(),
						footer: z
							.object({
								text: z.string().optional(),
							})
							.optional(),
						author: z
							.object({
								name: z.string().optional(),
							})
							.optional(),
					})
					.optional();
				values.embed_welcome = plugin.embed_welcome ?? {
					color: "",
					title: "",
					description: "",
					fields: [],
					thumbnail: { url: "" },
					image: { url: "" },
					footer: { text: "" },
					author: { name: "" },
				};

				// Leave Embed
				schemaFields.embed_leave = z
					.object({
						color: z.string().optional(),
						title: z.string().optional(),
						description: z.string().optional(),
						fields: z
							.array(
								z.object({
									name: z.string().optional().default(""),
									value: z.string().optional().default(""),
									inline: z.boolean().optional().default(false),
								}),
							)
							.optional()
							.default([]),
						thumbnail: z
							.object({
								url: z.string().optional(),
							})
							.optional(),
						image: z
							.object({
								url: z.string().optional(),
							})
							.optional(),
						footer: z
							.object({
								text: z.string().optional(),
							})
							.optional(),
						author: z
							.object({
								name: z.string().optional(),
							})
							.optional(),
					})
					.optional();
				values.embed_leave = plugin.embed_leave ?? {
					color: "",
					title: "",
					description: "",
					fields: [],
					thumbnail: { url: "" },
					image: { url: "" },
					footer: { text: "" },
					author: { name: "" },
				};
				break;
			case "moderation":
				schemaFields.moderation_log_channel = z.string().optional();
				values.moderation_log_channel = plugin.moderation_log_channel ?? "";
				break;
			case "welcome":
				schemaFields.welcome_message = z.string().optional().default("");
				values.welcome_message = plugin.welcome_message ?? "";
				schemaFields.welcome_roles = z
					.array(
						z.object({
							role_id: z.string(),
						}),
					)
					.default([]);
				values.welcome_roles = plugin.welcome_roles ?? [];
				break;
			default:
				// Default plugin - dynamic options based on type
				for (const key of Object.keys(plugin)) {
					if (
						["id", "name", "description", "createdAt", "updatedAt"].includes(
							key,
						)
					) {
						continue;
					}

					const value = plugin[key as keyof Plugin];
					if (typeof value === "string") {
						schemaFields[key] = z.string().optional();
						values[key] = value;
					} else if (typeof value === "boolean") {
						schemaFields[key] = z.boolean().optional();
						values[key] = value;
					}
				}
		}

		return {
			schema:
				Object.keys(schemaFields).length > 0
					? z.object(schemaFields)
					: undefined,
			defaultValues: values,
		};
	};

	// Get schema and default values
	const { schema, defaultValues } = prepareFormConfig();

	// Initialize form before any components that need it
	const form = useForm<FormValues>({
		resolver: schema ? zodResolver(schema) : undefined,
		defaultValues,
		shouldUnregister: false,
	});

	// Now create the form fields using the form
	const generateFormFields = useCallback(() => {
		const formFields: React.ReactNode[] = [];

		switch (plugin.id) {
			case "levels": {
				formFields.push(
					<ChannelField
						key="channel_id"
						name="channel_id"
						label="Level-up Notification Channel"
						description="Channel to send level-up notifications"
						guildId={guildId}
					/>,
				);

				formFields.push(
					<MessageField
						key="reward_message"
						guildId={guildId}
						name="reward_message"
						label="Reward Message"
						description="Message sent when a user reaches a new level. You can use {level} as a placeholder."
					/>,
				);

				formFields.push(
					<ArrayField
						key="reward_roles"
						name="reward_roles"
						label="Reward Roles"
						description="Roles assigned to users when they reach specific levels"
						arrayType="levelRoles"
						guildId={guildId}
					/>,
				);

				formFields.push(
					<ArrayField
						key="boost_3x_roles"
						name="boost_3x_roles"
						label="3x XP Boost Roles"
						description="Roles that receive 3x XP boosts"
						arrayType="roles"
						guildId={guildId}
					/>,
				);
				break;
			}
			case "welcome_goodbye":
				{
					// Add tabs for switching between text and embed
					formFields.push(
						<div key="message_type_tabs" className="col-span-2 mb-4">
							<div className="mb-2 flex space-x-2 border-b border-gray-200 dark:border-gray-800">
								<button
									type="button"
									className={`relative pb-2 pt-1 ${
										form.watch("type") === "text"
											? "border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400"
											: "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
									}`}
									onClick={() =>
										form.setValue("type", "text", { shouldDirty: true })
									}
								>
									Text message
								</button>
								<button
									type="button"
									className={`relative pb-2 pt-1 ${
										form.watch("type") === "embed"
											? "border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400"
											: "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
									}`}
									onClick={() =>
										form.setValue("type", "embed", { shouldDirty: true })
									}
								>
									Embed message
								</button>
							</div>
						</div>,
					);

					// Welcome channel
					formFields.push(
						<ChannelField
							key="welcome_channel_id"
							name="welcome_channel_id"
							label="Welcome Message Channel"
							description="Channel to send welcome messages when a user joins"
							guildId={guildId}
						/>,
					);

					// Goodbye channel
					formFields.push(
						<ChannelField
							key="leave_channel_id"
							name="leave_channel_id"
							label="Goodbye Message Channel"
							description="Channel to send goodbye messages when a user leaves"
							guildId={guildId}
						/>,
					);

					// Join role
					formFields.push(
						<RoleField
							key="join_role_id"
							name="join_role_id"
							label="Welcome Role"
							description="Role to assign to new members when they join"
							guildId={guildId}
						/>,
					);

					const watchedType = form.watch("type");

					// Text message fields
					if (watchedType === "text") {
						// Welcome message
						formFields.push(
							<MessageField
								key="welcome_message"
								guildId={guildId}
								name="welcome_message"
								label="Welcome Message"
								description="Message sent when a user joins the server
You can use variables like {user}, {server}, etc."
							/>,
						);

						// Leave message
						formFields.push(
							<MessageField
								key="leave_message"
								guildId={guildId}
								name="leave_message"
								label="Goodbye Message"
								description="Message sent when a user leaves the server"
							/>,
						);
					}

					// Embed message fields
					if (watchedType === "embed") {
						const watchedEmbedWelcome = {
							color: form.watch("embed_welcome.color") as string,
							title: form.watch("embed_welcome.title") as string,
							description: form.watch("embed_welcome.description") as string,
							thumbnail: {
								url: form.watch("embed_welcome.thumbnail.url") as string,
							},
							image: { url: form.watch("embed_welcome.image.url") as string },
							footer: {
								text: form.watch("embed_welcome.footer.text") as string,
							},
							author: {
								name: form.watch("embed_welcome.author.name") as string,
							},
						};

						// Discord-like embed editor layout
						formFields.push(
							<div
								key="embed_editor"
								className="col-span-2 mt-4 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
							>
								<div className="flex flex-col space-y-6 md:flex-row md:space-x-6 md:space-y-0">
									{/* Left column - Form controls */}
									<div className="w-full space-y-4 md:w-1/2">
										<h3 className="text-lg font-medium">
											Welcome Embed Settings
										</h3>

										{/* Color picker */}
										<div className="mb-4">
											<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
												Stripe color
											</label>
											<div className="flex flex-wrap items-center gap-2">
												{/* Custom Color */}
												<Button
													type="button"
													size="sm"
													onClick={() => {
														// TODO: open color picker modal
													}}
												>
													<span className="text-sm">Custom</span>
												</Button>
												{[
													"#000000", // Default / Custom
													"#FFFFFF", // White
													"#1ABC9C", // Aqua
													"#E91E63", // Pink
													"#F1C40F", // Yellow
													"#11806A", // Green
													"#3498DB", // Blue
													"#9B59B6", // Purple
													"#E67E22", // Orange
													"#607D8B", // Gray
													"#1F8B4C", // Dark Green
													"#71368A", // Dark Purple
												].map((color) => (
													// TODO: make color circle small with empty space and border (only for white)
													<Button
														key={color}
														type="button"
														size="iconSm"
														className={`rounded-full border p-1 size-5 ${
															(watchedEmbedWelcome.color || "#3498DB") === color
																? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900"
																: "border-gray-300 dark:border-gray-700"
														}`}
														style={{ backgroundColor: color }}
														onClick={() => {
															form.setValue(
																"embed_welcome.color",
																color as never,
																{
																	shouldDirty: true,
																},
															);
														}}
														aria-label={`Color ${color}`}
													/>
												))}
											</div>
										</div>

										{/* Author */}
										<div className="mb-4 w-full">
											<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
												Author
											</label>
											<div className="w-full">
												<MessageField
													guildId={guildId}
													name="embed_welcome.author.name"
													label=""
													description="Author name"
													placeholder="Author name"
													singleLine={true}
												/>
											</div>
										</div>

										{/* Title */}
										<div className="mb-4">
											<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
												Title text
											</label>
											<FormField
												control={form.control}
												name="embed_welcome.title"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<MentionTextarea
																placeholder="Title text"
																value={(field.value as string) || ""}
																onChange={field.onChange}
																singleLine={true}
																showEmojiPicker={false}
																maxLength={256}
																guildId={guildId}
															/>
														</FormControl>
													</FormItem>
												)}
											/>
										</div>

										{/* Description */}
										<div className="mb-4 w-full">
											<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
												Message template
											</label>
											<div className="w-full">
												<MessageField
													guildId={guildId}
													name="embed_welcome.description"
													label=""
													description="You can use placeholders: {user} for mention, {username} for username, {server} for server name"
													singleLine={false}
													showEmojiPicker={false}
													maxLength={2000}
												/>
											</div>
										</div>

										{/* Fields */}
										<div className="mb-4">
											<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
												Embed Fields
											</label>
											<FormField
												control={form.control}
												name="embed_welcome.fields"
												render={({ field }) => (
													<EmbedFieldsEditor
														field={field}
														form={form}
														guildId={guildId}
													/>
												)}
											/>
										</div>
									</div>

									{/* Right column - Preview */}
									<div className="w-full md:w-1/2">
										<div className="sticky top-4">
											<h3 className="mb-4 flex items-center text-lg font-medium">
												<EyeIcon className="mr-2 h-5 w-5" />
												Preview
											</h3>
											<div className="rounded-md bg-[#313338] p-4 text-white">
												<DiscordEmbedPreview
													embed={watchedEmbedWelcome}
													author={{
														name:
															watchedEmbedWelcome.author?.name ||
															"User joined the server",
														iconURL:
															"https://cdn.discordapp.com/embed/avatars/0.png",
													}}
												/>
											</div>
											<div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
												This is how the embed will appear in Discord.
												<br />
												Placeholders will be replaced with actual values when
												the message is sent.
											</div>
										</div>
									</div>
								</div>
							</div>,
						);
					}
				}
				break;
			case "moderation":
				formFields.push(
					<ChannelField
						key="moderation_log_channel"
						name="moderation_log_channel"
						label="Moderation Log Channel"
						description="Channel to send moderation logs"
						guildId={guildId}
					/>,
				);
				break;
		}

		return formFields;
	}, [plugin.id, form, guildId]);

	// Initialize form state
	const [formState, setFormState] = useState<{
		schema: z.ZodObject<z.ZodRawShape> | undefined;
		defaultValues: Record<string, unknown>;
		fields: React.ReactNode[];
	}>({
		schema,
		defaultValues,
		fields: generateFormFields() as React.ReactNode[],
	});
	// Set initial values stored in ref
	useEffect(() => {
		// Capture initial form values
		initialSavedValuesRef.current = formState.defaultValues;

		// Use a small delay to capture the actual processed form values after initial rendering
		// This ensures we compare against the actual HTML structure generated by the editor
		const timer = setTimeout(() => {
			const currentValues = form.getValues();
			initialSavedValuesRef.current = currentValues;
			// Log only in development
			if (process.env.NODE_ENV === "development") {
				console.log("Initial form values captured");
			}
		}, 500);

		return () => clearTimeout(timer);
	}, [formState.defaultValues, form]);

	// Save changes to localStorage
	useEffect(() => {
		const subscription = form.watch((value) => {
			// Ensure enabled state is explicitly included
			const valueToSave = { ...value };
			localStorage.setItem(UNSAVED_KEY(plugin.id), JSON.stringify(valueToSave));
			setHasUnsavedChanges(true);
		});

		return () => subscription.unsubscribe();
	}, [plugin.id, form]);

	// Split the form watch and toast logic into separate effects
	useEffect(() => {
		// Use a debounce timer to prevent rapid firing on mention textareas
		let debounceTimer: NodeJS.Timeout | null = null;

		// Only update fields that match certain criteria to avoid unnecessary re-renders
		const subscription = form.watch((value, { name, type }) => {
			// Skip the initial render
			if (initialRenderRef.current) return;

			// Only process certain field types that might need embed previews updated
			if (
				name &&
				(name.includes("embed") ||
					name.includes("welcome") ||
					name.includes("leave") ||
					name === "type")
			) {
				// Clear previous timer
				if (debounceTimer) clearTimeout(debounceTimer);

				// Set a new debounce timer with a longer delay for embed fields
				// to reduce cascading re-renders
				debounceTimer = setTimeout(
					() => {
						setFormState((prev) => ({
							...prev,
							fields: generateFormFields(),
						}));
					},
					name.includes("embed") ? 600 : 300,
				); // Longer debounce for embed fields
			}
		});

		return () => {
			subscription.unsubscribe();
			if (debounceTimer) clearTimeout(debounceTimer);
		};
	}, [form, generateFormFields]);

	// Effect to listen for plugin-config-saved events
	useEffect(() => {
		const handlePluginSaved = (event: Event) => {
			const customEvent = event as CustomEvent<{
				pluginId: string;
				data: Record<string, unknown>;
			}>;

			// Only process if it's for this plugin
			if (customEvent.detail.pluginId === plugin.id) {
				// Prevent infinite loop by checking if already processing save
				if (hasShownToastRef.current) {
					hasShownToastRef.current = false;
					return;
				}

				// Update form state
				setFormState((prev) => ({
					...prev,
					fields: generateFormFields() as React.ReactNode[],
				}));
			}
		};

		window.addEventListener("plugin-config-saved", handlePluginSaved);
		return () => {
			window.removeEventListener("plugin-config-saved", handlePluginSaved);
		};
	}, [plugin.id, generateFormFields]);

	// Memoize the onSubmit function to prevent it changing on every render
	const onSubmitMemoized = useCallback(
		async (data: FormValues) => {
			try {
				// Mark as saving to prevent feedback loops
				savingRef.current = true;

				// Create API endpoint URL
				const apiUrl = `/api/guilds/${guildId}/plugins/set`;

				// API call to save plugin config
				const response = await fetch(apiUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						pluginId: plugin.id,
						guildId,
						config: data,
					}),
				});

				if (!response.ok) {
					throw new Error(`API returned ${response.status}`);
				}

				// On success, clear unsaved changes
				localStorage.removeItem(UNSAVED_KEY(plugin.id));
				setHasUnsavedChanges(false);

				// Show success toast and clear any pending toasts
				if (toastIdRef.current) {
					sonnerToast.dismiss(toastIdRef.current);
					toastIdRef.current = null;
				}

				sonnerToast.success("Changes saved successfully");

				// Reset saving flag
				savingRef.current = false;
			} catch (error) {
				console.error("Failed to save plugin config", error);
				sonnerToast.error("Failed to save changes");
				savingRef.current = false;
			}
		},
		[guildId, plugin.id],
	);

	// Update the toast effect to use the new custom toast
	useEffect(() => {
		// Always dismiss toast when there are no unsaved changes
		if (!hasUnsavedChanges) {
			if (toastIdRef.current) {
				sonnerToast.dismiss(toastIdRef.current);
				toastIdRef.current = null;
			}
			return;
		}

		// Only show the toast if we have unsaved changes and no toast is currently shown
		if (!toastIdRef.current) {
			// Create a function that references the toast ID after it's created
			const toastContent = (toastId: string | number) => (
				<FormToast
					id={toastId}
					message="You have unsaved changes"
					onSave={() => {
						form.handleSubmit(onSubmitMemoized)();
					}}
					onReset={() => {
						form.reset(formState.defaultValues);
						localStorage.removeItem(UNSAVED_KEY(plugin.id));
						setHasUnsavedChanges(false);
					}}
				/>
			);

			// Create the toast with the function
			const newToastId = showFormToast({
				message: "You have unsaved changes",
				onSave: () => {
					form.handleSubmit(onSubmitMemoized)();
				},
				onReset: () => {
					form.reset(formState.defaultValues);
					localStorage.removeItem(UNSAVED_KEY(plugin.id));
					setHasUnsavedChanges(false);
				},
			});

			toastIdRef.current = newToastId;
		}

		// Cleanup toast when component unmounts
		return () => {
			if (toastIdRef.current) {
				sonnerToast.dismiss(toastIdRef.current);
			}
		};
	}, [
		hasUnsavedChanges,
		plugin.id,
		form,
		formState.defaultValues,
		onSubmitMemoized,
	]);

	// Load guild data when needed
	useEffect(() => {
		const loadGuildData = async () => {
			if (!guildId || loading) return;
			setLoading(true);
			try {
				// Get data from localStorage
				const cachedDataKey = `guild-${guildId}`;
				const cachedDataString = localStorage.getItem(cachedDataKey);
				if (cachedDataString) {
					const cachedData = JSON.parse(cachedDataString);
					if (cachedData?.data) {
						setGuildData(cachedData.data);

						// Store guild data in window for mention display
						if (typeof window !== "undefined") {
							const typedWindow = window as WindowWithGuildData;
							typedWindow.__guildData = cachedData.data;
						}
					}
				}
			} catch (error) {
				console.error("Failed to load guild data", error);
			} finally {
				setLoading(false);
			}
		};

		loadGuildData();
	}, [guildId, loading]);

	if (!formState.schema || formState.fields.length === 0) {
		return (
			<div className="text-center py-4">
				<p className="text-muted-foreground">
					No configuration settings available for this plugin.
				</p>
			</div>
		);
	}

	return (
		<div className="plugin-config-form">
			<FormProvider {...form}>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmitMemoized)}
						className="space-y-6"
					>
						{/* Display any form-level validation errors */}
						{form.formState.errors.root && (
							<div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 mb-4">
								{form.formState.errors.root.message}
							</div>
						)}

						{formState.fields.map((field, index) => {
							// Get field information for a better key
							const fieldElement = field as React.ReactElement<{
								name: string;
							}>;
							const fieldName = fieldElement.props?.name;

							return (
								<div key={`field-${fieldName || `unnamed-${index}`}`}>
									{field}
								</div>
							);
						})}
					</form>
				</Form>
			</FormProvider>
		</div>
	);
}
