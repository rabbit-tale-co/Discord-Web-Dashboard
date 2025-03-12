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
import { cn } from "@/lib/utils";
import { Server, Flag, User, Check, Upload } from "lucide-react";
import Image from "next/image";

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
import type { User as DiscordUser } from "discord.js";
import { MessageField } from "../fields/message-field";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImageIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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

// ThumbnailSelector component
interface ThumbnailSelectorProps {
	value: string;
	onChange: (value: string) => void;
	guildData: GuildData;
	userData: DiscordUser | null;
	label?: string;
	size?: "small" | "large";
}

function ThumbnailSelector({
	value,
	onChange,
	guildData,
	userData,
	label,
	size = "small",
}: ThumbnailSelectorProps) {
	const [open, setOpen] = React.useState(false);
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [selectedOption, setSelectedOption] = React.useState<string>(
		value || "",
	);
	const [tempSelected, setTempSelected] = React.useState<string>(value || "");
	const [customUrl, setCustomUrl] = React.useState<string>(
		value && !value.startsWith("{") ? value : "",
	);
	const [fileUpload, setFileUpload] = React.useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = React.useState<string>("");

	// Predefined variables
	const variables = [
		{
			id: "none",
			label: "None",
			description: "No image will be displayed",
			icon: <ImageIcon className="size-4" />,
		},
		{
			id: "{server_image}",
			label: "Server Image",
			description: "Use the server's icon",
			icon: <Server className="size-4" />,
		},
		{
			id: "{server_banner}",
			label: "Server Banner",
			description: "Use the server's banner",
			icon: <Flag className="size-4" />,
		},
		{
			id: "{avatar}",
			label: "User Avatar",
			description: "Use the user's avatar",
			icon: <User className="size-4" />,
		},
	];

	// Handle file selection
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setFileUpload(file);
			// Create a data URL for the file
			const reader = new FileReader();
			reader.onload = (e) => {
				const dataUrl = e.target?.result as string;
				setPreviewUrl(dataUrl);
				setTempSelected("upload");
			};
			reader.readAsDataURL(file);
		}
	};

	// Handle dialog open/close
	const handleOpenChange = (open: boolean) => {
		if (open) {
			setTempSelected(selectedOption);
		}
		setOpen(open);
	};

	// Handle form submission
	const handleConfirm = () => {
		setSelectedOption(tempSelected);
		if (tempSelected === "custom" && customUrl) {
			onChange(customUrl);
		} else if (tempSelected === "upload" && previewUrl) {
			onChange(previewUrl);
		} else if (tempSelected === "none") {
			onChange("");
		} else if (tempSelected) {
			onChange(tempSelected);
		}
		setOpen(false);
	};

	// Preview component
	const ThumbnailPreview = () => {
		const hasValue = value && value.trim() !== "";
		const isVariable = hasValue && value.startsWith("{");

		const getVariableImageUrl = () => {
			if (!isVariable) return null;

			switch (value) {
				case "{server_image}": {
					if (!guildData?.guild_details?.icon) return null;
					return avatarUrl(
						guildData.id,
						guildData.guild_details.icon,
						1024,
						false,
					);
				}
				case "{avatar}": {
					if (!userData?.id || !userData?.avatar) return null;
					return avatarUrl(userData.id, userData.avatar, 1024, true);
				}
				case "{server_banner}": {
					if (!guildData?.guild_details?.banner) return null;
					return avatarUrl(
						guildData.id,
						guildData.guild_details.banner,
						1024,
						false,
					);
				}
				default:
					return null;
			}
		};

		return (
			<div
				className={cn(
					"w-full border-2 border-dashed border-input rounded-md flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-background",
					size === "large" ? "h-[300px]" : "aspect-square",
				)}
			>
				{hasValue ? (
					<div className="w-full h-full flex items-center justify-center">
						{isVariable ? (
							<React.Fragment>
								{value === "{server_image}" &&
									(guildData?.guild_details?.icon ? (
										<div className="relative w-full h-full">
											<Image
												src={getVariableImageUrl() || ""}
												alt="Server icon"
												fill
												className="object-cover rounded-md"
												onError={(e) => {
													e.currentTarget.style.display = "none";
													e.currentTarget.nextElementSibling?.classList.remove(
														"hidden",
													);
												}}
											/>
											<div className="hidden absolute inset-0 flex items-center justify-center">
												<Server
													className={size === "large" ? "size-12" : "size-8"}
												/>
											</div>
										</div>
									) : (
										<Server
											className={size === "large" ? "size-12" : "size-8"}
										/>
									))}
								{value === "{server_banner}" &&
									(guildData?.guild_details?.banner ? (
										<div className="relative w-full h-full">
											<Image
												src={getVariableImageUrl() || ""}
												alt="Server banner"
												fill
												className="object-cover rounded-md"
												onError={(e) => {
													e.currentTarget.style.display = "none";
													e.currentTarget.nextElementSibling?.classList.remove(
														"hidden",
													);
												}}
											/>
											<div className="hidden absolute inset-0 flex items-center justify-center">
												<Flag
													className={size === "large" ? "size-12" : "size-8"}
												/>
											</div>
										</div>
									) : (
										<Flag className={size === "large" ? "size-12" : "size-8"} />
									))}
								{value === "{avatar}" &&
									(userData?.avatar ? (
										<div className="relative w-full h-full">
											<Image
												src={getVariableImageUrl() || ""}
												alt="User avatar"
												fill
												className="object-cover rounded-md"
												onError={(e) => {
													e.currentTarget.style.display = "none";
													e.currentTarget.nextElementSibling?.classList.remove(
														"hidden",
													);
												}}
											/>
											<div className="hidden absolute inset-0 flex items-center justify-center">
												<User
													className={size === "large" ? "size-12" : "size-8"}
												/>
											</div>
										</div>
									) : (
										<User className={size === "large" ? "size-12" : "size-8"} />
									))}
							</React.Fragment>
						) : (
							<div className="relative w-full h-full">
								<Image
									src={value}
									alt="Selected image"
									fill
									className="object-cover rounded-md"
									onError={(e) => {
										e.currentTarget.style.display = "none";
										e.currentTarget.nextElementSibling?.classList.remove(
											"hidden",
										);
									}}
								/>
								<div className="hidden absolute inset-0 flex flex-col items-center justify-center">
									<ImageIcon
										className={size === "large" ? "h-12 w-12" : "h-8 w-8"}
									/>
									<span className="text-sm text-gray-400 mt-2">
										Invalid image
									</span>
								</div>
							</div>
						)}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center text-gray-400">
						<ImageIcon className={size === "large" ? "size-12" : "size-8"} />
					</div>
				)}
			</div>
		);
	};

	const dialogContent = (
		<div className="space-y-4">
			<Tabs defaultValue="variables" className="w-full">
				<TabsList className="grid grid-cols-2 mb-4">
					<TabsTrigger value="variables">Variables</TabsTrigger>
					<TabsTrigger value="upload">Upload</TabsTrigger>
				</TabsList>

				<div className="h-[300px] relative">
					<TabsContent
						value="variables"
						className="absolute inset-0 overflow-auto pr-2"
					>
						<div className="space-y-2">
							{variables.map((variable) => (
								<button
									key={variable.id}
									type="button"
									onClick={() => setTempSelected(variable.id)}
									className={cn(
										"flex items-center w-full p-3 rounded-md border border-input transition-all",
										tempSelected === variable.id
											? "border-discord-bg bg-background"
											: "bg-background hover:border-gray-500",
									)}
								>
									<div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted mr-3">
										{variable.icon}
									</div>
									<div className="flex-1 text-left">
										<div className="text-sm font-medium">{variable.label}</div>
										<div className="text-xs text-gray-400">
											{variable.description}
										</div>
									</div>
									{tempSelected === variable.id && (
										<div className="flex items-center justify-center size-5 rounded-full bg-discord-bg ml-2">
											<Check className="size-3 text-white" />
										</div>
									)}
								</button>
							))}
						</div>
					</TabsContent>

					<TabsContent value="upload" className="absolute inset-0">
						<div className="flex flex-col items-center justify-center p-6 space-y-4">
							<div className="w-full h-48 rounded-md bg-muted flex items-center justify-center relative">
								{previewUrl ? (
									<div className="relative w-full h-full">
										<Image
											src={previewUrl}
											alt="Selected image"
											fill
											className="object-cover rounded-md"
											onError={(e) => {
												e.currentTarget.style.display = "none";
												e.currentTarget.nextElementSibling?.classList.remove(
													"hidden",
												);
											}}
										/>
										<div className="hidden absolute inset-0 flex flex-col items-center justify-center">
											<ImageIcon className="h-8 w-8" />
											<span className="text-sm text-gray-400 mt-2">
												Invalid image
											</span>
										</div>
									</div>
								) : (
									<>
										<Upload className="h-8 w-8 text-muted-foreground" />
									</>
								)}
							</div>
							<Input
								id="image-upload"
								type="file"
								accept="image/*"
								onChange={handleFileChange}
								className="hidden"
							/>
							<Button
								variant="outline"
								onClick={() => document.getElementById("image-upload")?.click()}
							>
								{previewUrl ? "Change Image" : "Upload Image"}
							</Button>
							<p className="text-xs text-gray-400 text-center">
								{previewUrl
									? "Click to change the image"
									: "Upload an image from your device"}
							</p>
						</div>
					</TabsContent>
				</div>

				<div className="mt-4 flex justify-end">
					<Button variant="discord" onClick={handleConfirm}>
						Save
					</Button>
				</div>
			</Tabs>
		</div>
	);

	if (isDesktop) {
		return (
			<div className="h-full">
				<Dialog open={open} onOpenChange={handleOpenChange}>
					<DialogTrigger asChild>
						<Button
							variant="ghost"
							className={`w-full p-0 border-0 ${size === "small" ? "mt-26" : "h-full"}`}
						>
							<ThumbnailPreview />
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[425px]">
						<DialogHeader>
							<DialogTitle>Select Image</DialogTitle>
						</DialogHeader>
						{dialogContent}
					</DialogContent>
				</Dialog>
			</div>
		);
	}

	return (
		<div className="h-full">
			<Drawer open={open} onOpenChange={handleOpenChange}>
				<DrawerTrigger asChild>
					<Button variant="ghost" className="w-full h-full p-0 border-0">
						<ThumbnailPreview />
					</Button>
				</DrawerTrigger>
				<DrawerContent>
					<DrawerHeader className="text-left">
						<DrawerTitle>Select Image</DrawerTitle>
					</DrawerHeader>
					<div className="px-4">{dialogContent}</div>
					<DrawerFooter className="pt-2">
						<DrawerClose asChild>
							<Button variant="outline">Cancel</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</div>
	);
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
	const [user, setUser] = useState<DiscordUser | null>(null);

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
				throw new Error("Bot ID not found in environment variables");
			}

			const response = await fetch("/api/plugins/set", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					bot_id,
					guild_id: guildId,
					plugin_name: "welcome_goodbye",
					config: {
						type: values.type,
						enabled: values.enabled,
						embed_leave: {
							color: values.embed_leave?.color,
							title: values.embed_leave?.title,
							footer: values.embed_leave?.footer?.text
								? {
										text: values.embed_leave.footer.text,
									}
								: undefined,
							description: values.embed_leave?.description,
							...(values.embed_leave?.thumbnail?.url
								? { thumbnail: { url: values.embed_leave.thumbnail.url } }
								: {}),
							...(values.embed_leave?.image?.url
								? { image: { url: values.embed_leave.image.url } }
								: {}),
							...(values.embed_leave?.fields?.length
								? {
										fields: values.embed_leave.fields.filter(
											(f) => f.name && f.value,
										),
									}
								: {}),
						},
						join_role_id: values.join_role_id,
						embed_welcome: {
							color: values.embed_welcome?.color,
							title: values.embed_welcome?.title,
							footer: values.embed_welcome?.footer?.text
								? {
										text: values.embed_welcome.footer.text,
									}
								: undefined,
							description: values.embed_welcome?.description,
							...(values.embed_welcome?.thumbnail?.url
								? { thumbnail: { url: values.embed_welcome.thumbnail.url } }
								: {}),
							...(values.embed_welcome?.image?.url
								? { image: { url: values.embed_welcome.image.url } }
								: {}),
							...(values.embed_welcome?.fields?.length
								? {
										fields: values.embed_welcome.fields.filter(
											(f) => f.name && f.value,
										),
									}
								: {}),
						},
						leave_message: values.leave_message,
						welcome_message: values.welcome_message,
						leave_channel_id: values.leave_channel_id,
						welcome_channel_id: values.welcome_channel_id,
					},
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.message || "Failed to update welcome configuration",
				);
			}

			await refetchPlugins();

			toast.success("Welcome configuration updated", {
				description: "Your changes have been saved successfully.",
			});
		} catch (error) {
			console.error("Error updating welcome config:", error);
			toast.error("Failed to save changes", {
				description:
					error instanceof Error
						? error.message
						: "An unexpected error occurred. Please try again.",
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
					<TabsList
						className={cn(
							"grid w-full",
							"grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1",
						)}
					>
						<TabsTrigger value="welcome-message" className="text-xs sm:text-sm">
							Welcome
						</TabsTrigger>
						<TabsTrigger value="leave-message" className="text-xs sm:text-sm">
							Leave
						</TabsTrigger>
						<TabsTrigger value="welcome-embed" className="text-xs sm:text-sm">
							W. Embed
						</TabsTrigger>
						<TabsTrigger value="leave-embed" className="text-xs sm:text-sm">
							L. Embed
						</TabsTrigger>
						<TabsTrigger value="channels" className="text-xs sm:text-sm">
							Channels
						</TabsTrigger>
						<TabsTrigger value="roles" className="text-xs sm:text-sm">
							Roles
						</TabsTrigger>
					</TabsList>

					<TabsContent
						key="welcome-message-tab"
						value="welcome-message"
						className="space-y-4 mt-4"
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
						className="space-y-4 mt-4"
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
						className="space-y-4 mt-4"
					>
						<div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
							<div className="space-y-4">
								<div className="flex gap-4">
									<div className="flex-1 flex flex-col gap-4">
										<FormField
											control={form.control}
											name="embed_welcome.color"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Stripe Color</FormLabel>
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
											// description="The title of your welcome embed"
											showEmojiPicker={false}
											rows={1}
											maxLength={100}
											id="welcome-embed-title-field"
										/>

										<MessageField
											name="embed_welcome.description"
											label="Description"
											// description="The main content of your welcome embed"
											showEmojiPicker={false}
											rows={4}
											maxLength={500}
											id="welcome-embed-description-field"
										/>

										<EmbedFieldsEditor
											name="embed_welcome.fields"
											label="Fields"
											// description="Add fields to your welcome embed"
											id="welcome-embed-fields"
										/>

										<FormField
											control={form.control}
											name="embed_welcome.image.url"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-sm">Image</FormLabel>
													<FormControl>
														<ThumbnailSelector
															value={field.value || ""}
															onChange={field.onChange}
															guildData={guildData || ({} as GuildData)}
															userData={user}
															label="Main Image"
															size="large"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<MessageField
											name="embed_welcome.footer.text"
											label="Footer"
											// description="Text that appears at the bottom of the welcome embed"
											showEmojiPicker={false}
											singleLine
											maxLength={100}
											id="welcome-embed-footer-field"
										/>
									</div>
									<div className="flex-shrink-0 w-20 self-start">
										<FormField
											control={form.control}
											name="embed_welcome.thumbnail.url"
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<ThumbnailSelector
															value={field.value || ""}
															onChange={field.onChange}
															guildData={guildData || ({} as GuildData)}
															userData={user}
														/>
													</FormControl>
												</FormItem>
											)}
										/>
									</div>
								</div>
							</div>

							<div className="space-y-4">
								<div className="block 2xl:hidden">
									<Dialog>
										<DialogTrigger asChild>
											<Button variant="outline" className="w-full">
												Show Preview
											</Button>
										</DialogTrigger>
										<DialogContent className="sm:max-w-3xl w-full">
											<DialogHeader>
												<DialogTitle>Embed Preview</DialogTitle>
											</DialogHeader>
											<EmbedPreview
												embed={
													formValues.type === "embed" ? previewEmbed : null
												}
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
										</DialogContent>
									</Dialog>
								</div>
								<div className="hidden 2xl:block sticky top-4">
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
						</div>
					</TabsContent>

					<TabsContent
						key="leave-embed-tab"
						value="leave-embed"
						className="space-y-4 mt-4"
					>
						<div className="grid grid-cols-2 gap-6">
							<div className="space-y-4">
								<div className="flex gap-4">
									<div className="flex-1 flex flex-col gap-4">
										<FormField
											control={form.control}
											name="embed_leave.color"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Color</FormLabel>
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

										<EmbedFieldsEditor
											name="embed_leave.fields"
											label="Fields"
											id="leave-embed-fields"
										/>

										<FormField
											control={form.control}
											name="embed_leave.image.url"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-sm">Image</FormLabel>
													<FormControl>
														<ThumbnailSelector
															value={field.value || ""}
															onChange={field.onChange}
															guildData={guildData || ({} as GuildData)}
															userData={user}
															label="Main Image"
															size="large"
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
									</div>
									<div className="flex-shrink-0 w-20 self-start">
										<FormField
											control={form.control}
											name="embed_leave.thumbnail.url"
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<ThumbnailSelector
															value={field.value || ""}
															onChange={field.onChange}
															guildData={guildData || ({} as GuildData)}
															userData={user}
															label="Thumbnail"
														/>
													</FormControl>
												</FormItem>
											)}
										/>
									</div>
								</div>
							</div>

							<div className="sticky top-4 space-y-4">
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
						className="space-y-4 mt-4"
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

					<TabsContent key="roles-tab" value="roles" className="space-y-4 mt-4">
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
