"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import type { Plugin } from "@/hooks/use-plugins";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
	FormField,
	FormItem,
	FormLabel,
	FormDescription,
	FormControl,
	FormMessage,
} from "@/components/ui/form";
import {
	Select,
	SelectItem,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "../ui/select";

// Import naszych komponentów pól formularza
import { ChannelField } from "./fields/channel-field";
import { RoleField } from "./fields/role-field";
import { TextField } from "./fields/text-field";
import { ToggleField } from "./fields/toggle-field";
import { ArrayField } from "./fields/array-field";
import { ColorField } from "./fields/color-field";
import { MessageField } from "./fields/message-field";
import { EmojiField } from "./fields/emoji-field";
import { toast as sonnerToast } from "sonner";
import { deepEqual } from "@/lib/deep-equal";
import type { ButtonHTMLAttributes, DetailedHTMLProps } from "react";
import { updatePluginsCache } from "@/hooks/use-plugins";

type PluginConfigFormProps = {
	plugin: Plugin;
	guildId: string;
	type: "basic" | "advanced";
};

const UNSAVED_KEY = (pluginId: string) => `unsaved-plugin-${pluginId}`;

interface FormToastProps {
	id: string | number;
	message: string;
	onSave: () => void;
	onReset: () => void;
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

export function PluginConfigForm({
	plugin,
	guildId,
	type,
}: PluginConfigFormProps) {
	type FormValues = Record<string, unknown>;

	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [isShaking, setIsShaking] = useState(false);
	const router = useRouter();

	// Refs for toast notifications and first render control
	const toastIdRef = useRef<string | number | undefined>(undefined);
	const initialRenderRef = useRef(true);
	const hasShownToastRef = useRef(false);
	const prevPluginIdRef = useRef(plugin.id);

	// Ref holding initial saved values for comparison
	const initialSavedValuesRef = useRef<Record<string, unknown>>({});

	// Track the previous view type to detect mode changes
	const prevTypeRef = useRef(type);

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
						color: z.number().optional(),
						title: z.string().optional(),
						description: z.string().optional(),
						thumbnail: z.object({ url: z.string() }).optional(),
						image: z.object({ url: z.string() }).optional(),
						footer: z.object({ text: z.string() }).optional(),
						fields: z
							.array(
								z.object({
									name: z.string(),
									value: z.string(),
									inline: z.boolean().optional(),
								}),
							)
							.optional(),
					})
					.optional();
				values.embed_welcome = plugin.embed_welcome ?? {
					color: 2336090,
					title: "Welcome to {server_name}! 🎉",
					description:
						"{user}, we're thrilled to have you dive into our vibrant community!",
					thumbnail: { url: "{avatar}" },
					image: { url: "{server_image}" },
					footer: { text: "We're glad to have you with us!" },
					fields: [],
				};

				// Leave Embed
				schemaFields.embed_leave = z
					.object({
						color: z.number().optional(),
						title: z.string().optional(),
						description: z.string().optional(),
						footer: z.object({ text: z.string() }).optional(),
					})
					.optional();
				values.embed_leave = plugin.embed_leave ?? {
					color: 15548997,
					title: "Goodbye, we'll miss you! 😔",
					description:
						"{username}, we're sad to see you go. We hope you'll return to {server_name} in the future.",
					footer: { text: "Until next time" },
				};
				break;
			case "moderation":
				schemaFields.moderation_log_channel = z.string().optional();
				values.moderation_log_channel = plugin.moderation_log_channel ?? "";
				break;
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
	const generateFormFields = () => {
		const formFields: React.ReactNode[] = [];

		switch (plugin.id) {
			case "levels":
				formFields.push(
					<ChannelField
						key="channel_id"
						name="channel_id"
						label="Levels channel"
						description="Channel to send level up notifications"
						guildId={guildId}
					/>,
				);
				formFields.push(
					<MessageField
						key="reward_message"
						guildId={guildId}
						name="reward_message"
						label="Reward message"
						description="Message sent when a user reaches a new level. You can use {level} as a placeholder."
					/>,
				);
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
				break;
			case "welcome":
				formFields.push(
					<MessageField
						key="welcome_message"
						guildId={guildId}
						name="welcome_message"
						label="Welcome message"
						description="Message sent when a user joins the server"
					/>,
				);
				formFields.push(
					<ArrayField
						key="welcome_roles"
						name="welcome_roles"
						label="Welcome roles"
						description="Roles assigned to new members"
						guildId={guildId}
						arrayType="roles"
					/>,
				);
				break;
			case "welcome_goodbye":
				// Type select (embed or text)
				formFields.push(
					<FormField
						key="type"
						control={form.control}
						name="type"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Message Type</FormLabel>
								<FormDescription>
									Choose between embed or text messages
								</FormDescription>
								<Select
									defaultValue={field.value as string}
									onValueChange={field.onChange}
									value={field.value as string}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select message type" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="embed">Embed</SelectItem>
										<SelectItem value="text">Text</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>,
				);

				// Welcome channel
				formFields.push(
					<ChannelField
						key="welcome_channel_id"
						name="welcome_channel_id"
						label="Welcome Channel"
						description="Channel to send welcome messages when a user joins"
						guildId={guildId}
					/>,
				);

				// Leave channel
				formFields.push(
					<ChannelField
						key="leave_channel_id"
						name="leave_channel_id"
						label="Goodbye Channel"
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

				// Welcome message
				formFields.push(
					<MessageField
						key="welcome_message"
						guildId={guildId}
						name="welcome_message"
						label="Welcome Message (Text)"
						description="Message sent when a user joins the server (used if type is text)"
					/>,
				);

				// Leave message
				formFields.push(
					<MessageField
						key="leave_message"
						guildId={guildId}
						name="leave_message"
						label="Goodbye Message (Text)"
						description="Message sent when a user leaves the server (used if type is text)"
					/>,
				);

				// Welcome Embed - Color
				formFields.push(
					<ColorField
						key="embed_welcome.color"
						name="embed_welcome.color"
						label="Welcome Embed Color"
						description="Color for the welcome embed (hex or decimal)"
					/>,
				);

				// Welcome Embed - Title
				formFields.push(
					<TextField
						key="embed_welcome.title"
						name="embed_welcome.title"
						label="Welcome Embed Title"
						description="Title for the welcome embed. You can use {server_name} as placeholder."
						placeholder="Welcome to {server_name}! 🎉"
					/>,
				);

				// Welcome Embed - Description
				formFields.push(
					<MessageField
						key="embed_welcome.description"
						guildId={guildId}
						name="embed_welcome.description"
						label="Welcome Embed Description"
						description="Main message in the welcome embed. You can use {user}, {username}, {server_name} as placeholders."
					/>,
				);

				// Welcome Embed - Thumbnail
				formFields.push(
					<TextField
						key="embed_welcome.thumbnail.url"
						name="embed_welcome.thumbnail.url"
						label="Welcome Embed Thumbnail"
						description="URL for the thumbnail image (small icon). You can use {avatar} to show user's avatar."
						placeholder="{avatar}"
					/>,
				);

				// Welcome Embed - Image
				formFields.push(
					<TextField
						key="embed_welcome.image.url"
						name="embed_welcome.image.url"
						label="Welcome Embed Image"
						description="URL for the main image. You can use {server_image} to show server's icon."
						placeholder="{server_image}"
					/>,
				);

				// Welcome Embed - Footer
				formFields.push(
					<TextField
						key="embed_welcome.footer.text"
						name="embed_welcome.footer.text"
						label="Welcome Embed Footer"
						description="Text to display in the footer of welcome embed."
						placeholder="We're glad to have you with us!"
					/>,
				);

				// Leave Embed - Color
				formFields.push(
					<ColorField
						key="embed_leave.color"
						name="embed_leave.color"
						label="Goodbye Embed Color"
						description="Color for the goodbye embed (hex or decimal)"
					/>,
				);

				// Leave Embed - Title
				formFields.push(
					<TextField
						key="embed_leave.title"
						name="embed_leave.title"
						label="Goodbye Embed Title"
						description="Title for the goodbye embed"
						placeholder="Goodbye, we'll miss you! 😔"
					/>,
				);

				// Leave Embed - Description
				formFields.push(
					<MessageField
						key="embed_leave.description"
						guildId={guildId}
						name="embed_leave.description"
						label="Goodbye Embed Description"
						description="Main message in the goodbye embed. You can use {username}, {server_name} as placeholders."
					/>,
				);

				// Leave Embed - Footer
				formFields.push(
					<TextField
						key="embed_leave.footer.text"
						name="embed_leave.footer.text"
						label="Goodbye Embed Footer"
						description="Text to display in the footer of goodbye embed."
						placeholder="Until next time"
					/>,
				);
				break;
			case "moderation":
				formFields.push(
					<ChannelField
						key="moderation_log_channel"
						name="moderation_log_channel"
						label="Moderation log channel"
						description="Channel to send moderation logs"
						guildId={guildId}
					/>,
				);
				break;
		}

		return formFields;
	};

	// Initialize form state
	const [formState, setFormState] = useState<{
		schema: z.ZodObject<z.ZodRawShape> | undefined;
		defaultValues: Record<string, unknown>;
		fields: React.ReactNode[];
	}>({
		schema,
		defaultValues,
		fields: generateFormFields(),
	});

	// Ustawienie początkowych wartości zapamiętanych w refie
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

			// If plugin has an enabled field but it's not in the form values, add it
			if ("enabled" in plugin && !("enabled" in valueToSave)) {
				valueToSave.enabled = plugin.enabled;
			}

			localStorage.setItem(UNSAVED_KEY(plugin.id), JSON.stringify(valueToSave));
		});
		return () => subscription.unsubscribe();
	}, [form, plugin]);

	// Split the form watch and toast logic into separate effects
	useEffect(() => {
		// Use a debounce timer to prevent rapid firing on mention textareas
		let debounceTimer: NodeJS.Timeout | null = null;

		const subscription = form.watch(() => {
			if (initialRenderRef.current) {
				initialRenderRef.current = false;
				return;
			}

			// Clear any existing timer
			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}

			// Set a new timer to check for changes after a short delay
			// This helps avoid false positives from intermediate states in complex inputs
			debounceTimer = setTimeout(() => {
				const currentValues = form.getValues();
				const isEqual = deepEqual(initialSavedValuesRef.current, currentValues);
				setHasUnsavedChanges(!isEqual);
			}, 300); // 300ms debounce
		});

		return () => {
			subscription.unsubscribe();
			// Clear the timer on cleanup
			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}
		};
	}, [form]);

	// Reset form when plugin changes or handle mode switches
	useEffect(() => {
		// If plugin ID changed - full reset
		if (plugin.id !== prevPluginIdRef.current) {
			initialRenderRef.current = true;
			hasShownToastRef.current = false;
			setHasUnsavedChanges(false);
			prevPluginIdRef.current = plugin.id;

			// Make sure we store the exact plugin data as the initial values
			const initialValues = { ...formState.defaultValues };

			// Explicitly set enabled state to ensure consistency
			if ("enabled" in plugin) {
				initialValues.enabled = plugin.enabled;
			}

			initialSavedValuesRef.current = initialValues;

			const unsaved = localStorage.getItem(UNSAVED_KEY(plugin.id));
			if (unsaved) {
				form.reset(JSON.parse(unsaved));
			} else {
				form.reset(initialValues);
			}
		}
		// If only the view type changed (basic/advanced)
		else if (type !== prevTypeRef.current) {
			// Store current values to keep track of unsaved changes
			const currentValues = form.getValues();
			const hasChanges = !deepEqual(
				initialSavedValuesRef.current,
				currentValues,
			);

			// Preserve the unsaved changes state when switching modes
			setHasUnsavedChanges(hasChanges);

			// Update the previous type ref
			prevTypeRef.current = type;

			// Re-trigger toast if there are unsaved changes
			if (hasChanges) {
				// Force-dismiss any existing toast to ensure it gets recreated
				if (toastIdRef.current) {
					sonnerToast.dismiss(toastIdRef.current);
					toastIdRef.current = undefined;
				}
				hasShownToastRef.current = false; // Force the toast to show again in the next effect run
			}
		}
	}, [plugin, type, form, formState.defaultValues]);

	// Memoize the onSubmit function to prevent it changing on every render
	const onSubmitMemoized = useCallback(
		async (data: FormValues) => {
			let configToSave: Record<string, unknown> = data;

			if (type === "advanced" && data.config && plugin.id === "default") {
				try {
					configToSave = JSON.parse(data.config as string);
				} catch (e) {
					console.error("Invalid JSON format", e);
					sonnerToast.error("Invalid JSON format", {
						description: "Please check your JSON format and try again.",
					});
					return;
				}
			}

			try {
				// First validate the form data
				if (formState.schema) {
					try {
						formState.schema.parse(configToSave);
					} catch (error) {
						console.error("Validation error:", error);
						if (error instanceof z.ZodError) {
							const errorMessages = error.errors
								.map((err) => `${err.path.join(".")}: ${err.message}`)
								.join("\n");
							sonnerToast.error("Validation failed", {
								description: errorMessages,
							});
							return;
						}
					}
				}

				// Make a direct POST request to the plugins/set endpoint instead of using onSave
				const response = await fetch("/api/plugins/set", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						bot_id: process.env.NEXT_PUBLIC_BOT_ID,
						guild_id: guildId,
						plugin_name: plugin.id,
						config: configToSave,
					}),
				});

				if (!response.ok) {
					const responseText = await response.text();
					console.error("Error response text:", responseText);

					let errorData = null;
					try {
						errorData = JSON.parse(responseText);
						console.error("Parsed error data:", errorData);
					} catch (e) {
						console.error("Could not parse error response as JSON");
					}

					throw new Error(
						`Failed to update plugin settings: ${errorData?.error || errorData?.message || response.statusText || "Unknown error"}`,
					);
				}

				// Store the submitted configuration as the latest saved state
				// This is what will be used both for form resets and localStorage
				initialSavedValuesRef.current = { ...configToSave };

				// Update localStorage with the latest configuration
				localStorage.setItem(
					UNSAVED_KEY(plugin.id),
					JSON.stringify(configToSave),
				);

				// Update UI state
				setHasUnsavedChanges(false);
				hasShownToastRef.current = false;

				if (toastIdRef.current) {
					sonnerToast.dismiss(toastIdRef.current);
					toastIdRef.current = undefined;
				}

				// Get the updated plugin data and update cache
				const updatedPluginResponse = await fetch(
					`/api/plugins?bot_id=${process.env.NEXT_PUBLIC_BOT_ID}&guild_id=${guildId}`,
					{
						cache: "no-store",
						headers: {
							"Cache-Control": "no-cache",
						},
					},
				);

				if (updatedPluginResponse.ok) {
					const updatedPlugins = await updatedPluginResponse.json();
					// Find the updated plugin
					const updatedPlugin = updatedPlugins.find(
						(p: Plugin) => p.id === plugin.id,
					);
					if (updatedPlugin) {
						// Create a merged version that includes both API data and our latest saved values
						const mergedPlugin = { ...updatedPlugin, ...configToSave };
						// Update the plugin in the plugins array
						const newPlugins = updatedPlugins.map((p: Plugin) =>
							p.id === plugin.id ? mergedPlugin : p,
						);
						// Update the cache with merged data
						updatePluginsCache(guildId, newPlugins);
					}
				}

				// Manually reset the form with our configToSave to ensure inputs have the latest values
				form.reset(configToSave);

				// Dispatch the event after cache is updated
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("plugin-config-saved", {
							detail: {
								pluginId: plugin.id,
								config: configToSave,
							},
						}),
					);
				}

				// Show success toast
				sonnerToast.success("Configuration saved", {
					description: "Plugin settings have been successfully updated.",
				});
			} catch (error) {
				console.error("Error saving plugin settings:", error);
				sonnerToast.error("Failed to save plugin configuration", {
					description:
						error instanceof Error ? error.message : "Please try again later.",
				});
			}
		},
		[plugin.id, guildId, formState.schema, type, form],
	);

	// Use onSubmitMemoized instead of onSubmit for form submission
	const onSubmit = onSubmitMemoized;

	// Effect to listen for plugin-config-saved events
	useEffect(() => {
		const handlePluginSaved = (event: Event) => {
			const customEvent = event as CustomEvent<{
				pluginId: string;
				config?: Record<string, unknown>;
			}>;
			// Only respond to events for this plugin
			if (customEvent.detail?.pluginId === plugin.id) {
				// If the event contains config data, use it directly
				if (customEvent.detail.config) {
					initialSavedValuesRef.current = customEvent.detail.config;
					form.reset(customEvent.detail.config);
				} else {
					// Otherwise fall back to our saved values reference
					form.reset(initialSavedValuesRef.current);
				}
				initialRenderRef.current = true;
			}
		};

		window.addEventListener("plugin-config-saved", handlePluginSaved);

		return () => {
			window.removeEventListener("plugin-config-saved", handlePluginSaved);
		};
	}, [plugin.id, form]);

	// Update the toast effect to use the new custom toast
	useEffect(() => {
		// Always dismiss toast when there are no unsaved changes
		if (!hasUnsavedChanges) {
			if (toastIdRef.current) {
				sonnerToast.dismiss(toastIdRef.current);
				toastIdRef.current = undefined;
			}
			hasShownToastRef.current = false;
			return;
		}

		// Show toast only if we have unsaved changes and haven't shown it yet or it was dismissed
		if (
			hasUnsavedChanges &&
			(!hasShownToastRef.current || !toastIdRef.current)
		) {
			hasShownToastRef.current = true;

			toastIdRef.current = showFormToast({
				message: "You have unsaved changes",
				onSave: () => form.handleSubmit(onSubmitMemoized)(),
				onReset: () => {
					try {
						// Reset the form to initial values
						form.reset(initialSavedValuesRef.current);
						// Clean up localStorage
						localStorage.removeItem(UNSAVED_KEY(plugin.id));
						// Update UI state
						setHasUnsavedChanges(false);
						hasShownToastRef.current = false;
					} catch (error) {
						console.error("Error during form reset:", error);
					}
				},
			});
		}

		return () => {
			if (plugin.id !== prevPluginIdRef.current) {
				if (toastIdRef.current) {
					sonnerToast.dismiss(toastIdRef.current);
					toastIdRef.current = undefined;
				}
			}
		};
	}, [hasUnsavedChanges, form, onSubmitMemoized, plugin.id]);

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
		<motion.div
			animate={isShaking ? { x: [0, -10, 10, -10, 10, 0] } : {}}
			transition={{ duration: 0.5 }}
		>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					{/* Display any form-level validation errors */}
					{form.formState.errors.root && (
						<div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 mb-4">
							{form.formState.errors.root.message}
						</div>
					)}

					{formState.fields.map((field) => {
						const fieldName = (field as React.ReactElement<{ name: string }>)
							.props.name;
						const isBasicField = [
							"channel_id",
							"reward_message",
							"welcome_message",
							"type",
							"enabled",
						].includes(fieldName);

						return (
							<div
								key={fieldName}
								className={type === "basic" && !isBasicField ? "hidden" : ""}
							>
								{type === "advanced" && isBasicField ? null : field}
							</div>
						);
					})}
				</form>
			</Form>
		</motion.div>
	);
}
