"use client";

import React, {
	useRef,
	useState,
	useCallback,
	useEffect,
	useMemo,
} from "react";
import { useFormContext } from "react-hook-form";
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
} from "@/components/ui/form";
import { getEditorInstance, MentionTextarea } from "@/components/ui/textarea";
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from "@/components/ui/popover";
import {
	Command,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandInput,
} from "@/components/ui/command";
import { getCachedData } from "@/lib/cache";
import type { GuildData } from "@/types/guild";
import {
	Editor,
	Transforms,
	Range as SlateRange,
	Point,
	Path,
	Element as SlateElement,
} from "slate";
import { ReactEditor } from "slate-react";
import { SmileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { emojis } from "@/lib/emojis";

// Define types for the emoji items
type EmojiItem = { emoji: string; keywords: string };

// Convert all emojis to objects with consistent structure
const processedCategories = emojis.map((category) => ({
	name: category.name,
	emojis: category.emojis.map((item) =>
		typeof item === "string" ? { emoji: item, keywords: item } : item,
	) as EmojiItem[],
}));

// Create a map of emoji categories for the picker
const emojiCategories = processedCategories.reduce(
	(acc, category) => {
		acc[category.name] = category.emojis.map((item) => item.emoji);
		return acc;
	},
	{} as Record<string, string[]>,
);

// Popular emojis for quick access
const POPULAR_EMOJIS = emojiCategories.Popular || [
	"👍",
	"❤️",
	"😊",
	"🙏",
	"👏",
	"🎉",
	"👋",
	"🔥",
	"✨",
	"😂",
];

const SUGGESTIONS = [
	{
		id: "user",
		name: "User",
		description: "User mention",
		example: "@User",
		category: "user",
	},
	{
		id: "username",
		name: "Username",
		description: "User's name",
		example: "User",
		category: "user",
	},
	{
		id: "display_name",
		name: "Display Name",
		description: "User's display name",
		example: "John Doe",
		category: "user",
	},
	{
		id: "avatar",
		name: "Avatar",
		description: "User's avatar",
		example: "https://example.com/avatar.png",
		category: "user",
	},
	{
		id: "server_name",
		name: "Server Name",
		description: "Server's name",
		example: "Server",
		category: "server",
	},
	{
		id: "server_image",
		name: "Server Image",
		description: "Server's image",
		example: "https://example.com/server_image.png",
		category: "server",
	},
	{
		id: "server_id",
		name: "server Id",
		description: "Server's id",
		example: "1234567890",
		category: "server",
	},
	{
		id: "level",
		name: "level",
		description: "User's current level",
		example: "5",
		category: "level",
	},
	{
		id: "ticket_id",
		name: "ticket Id",
		description: "Ticket id",
		example: "10",
		category: "tickets",
	},
	{
		id: "opened_by",
		name: "Opened By",
		description: "User who opened the ticket",
		example: "@user",
		category: "tickets",
	},
	{
		id: "opened_time",
		name: "Opened At",
		description: "Date and time the ticket was opened",
		example: "2021-01-01 12:00:00",
		category: "tickets",
	},
	{
		id: "closed_by",
		name: "Closed By",
		description: "User who closed the ticket",
		example: "@user",
		category: "tickets",
	},
	{
		id: "closed_time",
		name: "Closed At",
		description: "Date and time the ticket was closed",
		example: "2021-01-01 12:00:00",
		category: "tickets",
	},
	{
		id: "reason",
		name: "Closed Reason",
		description: "Reason the ticket was closed",
		example: "Spam",
		category: "tickets",
	},
	{
		id: "channel_id",
		name: "Channel Id",
		description: "Channel id",
		example: "1234567890",
		category: "general",
	},
	{
		id: "claimed_by",
		name: "Claimed By",
		description: "User who claimed the ticket",
		example: "@user",
		category: "tickets",
	},
	{
		id: "category",
		name: "Category",
		description: "Category of the ticket",
		example: "Bug Report",
		category: "tickets",
	},
];

// Define the categories and their display order
const CATEGORIES = [
	{ id: "general", name: "General", icon: "🔹" },
	{ id: "user", name: "User", icon: "👤" },
	{ id: "server", name: "Server", icon: "🖥️" },
	{ id: "tickets", name: "Tickets", icon: "🎫" },
	{ id: "music", name: "Music", icon: "🎵" },
	{ id: "level", name: "Level", icon: "🔝" },
];

type MentionType = "variable" | "role" | "channel";

interface MentionAnchor {
	x: number;
	y: number;
}

// Interface for the window with guild data
interface WindowWithGuildData extends Window {
	__guildData?: GuildData;
}

interface MessageFieldProps {
	name: string;
	label?: string;
	description?: string;
	guildId: string;
	multiline?: boolean;
	showEmojiPicker?: boolean;
	singleLine?: boolean;
	rows?: number;
	maxLength?: number;
	placeholder?: string;
}

export function MessageField({
	name,
	label,
	description,
	guildId,
	multiline = true,
	showEmojiPicker = true,
	singleLine = false,
	placeholder,
	rows = 3,
	maxLength,
}: MessageFieldProps) {
	const form = useFormContext();
	const commandInputRef = useRef<HTMLInputElement>(null);

	// State for mention handling
	const [mentionOpen, setMentionOpen] = useState(false);
	const [mentionAnchor, setMentionAnchor] = useState<MentionAnchor | null>(
		null,
	);
	const [mentionType, setMentionType] = useState<MentionType>("variable");
	const [searchValue, setSearchValue] = useState("");

	// State for tracking textarea focus and emoji picker
	const [isFieldFocused, setIsFieldFocused] = useState(name.includes("level"));
	const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

	// Guild data for roles and channels
	const [guildData, setGuildData] = useState<GuildData | null>(null);
	const [loading, setLoading] = useState(false);

	// Filter roles and channels based on search
	const filteredRoles = useMemo(() => {
		if (!guildData || !guildData.roles) return [];
		return guildData.roles.filter((role) =>
			role.name.toLowerCase().includes(searchValue.toLowerCase()),
		);
	}, [guildData, searchValue]);

	const filteredChannels = useMemo(() => {
		if (!guildData || !guildData.channels) return [];
		return guildData.channels.filter((channel) =>
			channel.name.toLowerCase().includes(searchValue.toLowerCase()),
		);
	}, [guildData, searchValue]);

	// Load guild data if needed
	useEffect(() => {
		const loadGuildData = async () => {
			if (!guildId || loading) return;
			setLoading(true);
			try {
				// Pobierz dane z localStorage zamiast z API
				const cachedData = getCachedData<GuildData>(`guild-${guildId}`);
				if (cachedData?.data) {
					// Wyodrębniamy właściwe dane z obiektu cache
					setGuildData(cachedData.data);

					// Store guild data in window for mention display
					if (typeof window !== "undefined") {
						const typedWindow = window as WindowWithGuildData;
						typedWindow.__guildData = cachedData.data;
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

	// Calculate character count
	const characterCount = useMemo(() => {
		if (!form.watch(name) || typeof form.watch(name) !== "string") return 0;
		// Remove HTML tags to get accurate character count
		return form.watch(name).replace(/<[^>]*>/g, "").length;
	}, [form, name]);

	// Handle focus and blur
	const handleFocus = useCallback(() => {
		setIsFieldFocused(true);
	}, []);

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLElement>) => {
			// Check if click was on emoji button or picker
			const isEmojiButtonClick = e?.relatedTarget?.closest(
				'[data-emoji-button="true"]',
			);
			const isEmojiPickerOpen = e?.relatedTarget?.closest('[role="dialog"]');
			const isEmojiPickerClosing = emojiPickerOpen && !isEmojiPickerOpen;

			// Keep field focused in the following cases:
			// 1. When clicking the emoji button
			// 2. When the emoji picker is open or was just open (closing)
			// 3. For level inputs (always keep emoji button visible)
			// 4. For welcome and leave messages
			if (
				isEmojiButtonClick ||
				isEmojiPickerOpen ||
				isEmojiPickerClosing ||
				name.includes("level") ||
				name.includes("welcome_message") ||
				name.includes("leave_message") ||
				emojiPickerOpen
			) {
				setIsFieldFocused(true);
				return;
			}

			setIsFieldFocused(false);
		},
		[name, emojiPickerOpen],
	);

	// Save the current selection range reference for mention insertion
	const savedRangeRef = useRef<Range | null>(null);

	// Update handleMentionStart to save the current selection
	const handleMentionStart = useCallback(
		(data: {
			type: MentionType;
			search: string;
			domRect: DOMRect;
		}) => {
			// Save the position for popover
			setMentionAnchor({
				x: data.domRect.left + 6,
				y: data.domRect.bottom + 6,
			});

			setMentionType(data.type);
			// Upewnij się, że pole wyszukiwania nie zawiera znaku wyzwalającego
			setSearchValue(data.search.replace(/^[@#\{]/, ""));
			setMentionOpen(true);

			// Save the current selection
			const selection = window.getSelection();
			if (selection && selection.rangeCount > 0) {
				savedRangeRef.current = selection.getRangeAt(0).cloneRange();
			}

			// Focus the input after popover opens
			setTimeout(() => {
				if (commandInputRef.current) {
					commandInputRef.current.focus();
				}
			}, 0);
		},
		[],
	);

	// Update handleMentionEnd to clear savedRangeRef
	const handleMentionEnd = useCallback(() => {
		setMentionOpen(false);
		setMentionAnchor(null);
		savedRangeRef.current = null;

		// Get the Slate editor instance
		const editor = getEditorInstance("mention-textarea");
		if (editor) {
			try {
				// Find and remove any mention placeholders in the document
				const placeholders = Array.from(
					Editor.nodes(editor, {
						at: [],
						match: (n) =>
							SlateElement.isElement(n) &&
							"type" in n &&
							n.type === "mention-placeholder",
					}),
				);

				// If there are any placeholders, remove them
				if (placeholders.length > 0) {
					for (const [_, placeholderPath] of placeholders) {
						// Remove the placeholder
						Transforms.removeNodes(editor, {
							at: placeholderPath,
							match: (n) =>
								SlateElement.isElement(n) &&
								"type" in n &&
								n.type === "mention-placeholder",
						});
					}
					// Focus the editor after removing placeholders
					setTimeout(() => {
						try {
							ReactEditor.focus(editor);
						} catch (e) {
							console.error("Error focusing editor:", e);
							const editorElement = document.querySelector('[role="textbox"]');
							if (editorElement instanceof HTMLElement) {
								editorElement.focus();
							}
						}
					}, 0);
				}
			} catch (error) {
				console.error("Error removing placeholder:", error);
			}
		}
	}, []);

	// Insert mention based on selected item
	const insertMention = useCallback(
		(
			type: MentionType,
			item: { id: string; name: string } | { name: string },
			range?: globalThis.Range,
		) => {
			// Restore the selection if needed
			if (range) {
				try {
					const selection = window.getSelection();
					if (selection) {
						selection.removeAllRanges();
						// Check if range is valid before adding it
						if (range && typeof range === "object" && "cloneRange" in range) {
							selection.addRange(range);
						}
					}
				} catch (error) {
					console.error("Error restoring selection range:", error);
				}
			}

			// Get the value to use for the mention
			const value = "id" in item ? item.id : item.name;

			// Get the Slate editor instance
			const editor = getEditorInstance("mention-textarea");
			if (editor) {
				try {
					// Find and remove any mention placeholder at current selection
					if (editor.selection) {
						// First, we'll get all placeholders in the document
						const placeholders = Array.from(
							Editor.nodes(editor, {
								at: [],
								match: (n) =>
									SlateElement.isElement(n) &&
									"type" in n &&
									n.type === "mention-placeholder",
							}),
						);

						// If there are any placeholders, remove the first one
						if (placeholders.length > 0) {
							const [_, placeholderPath] = placeholders[0];
							// Set selection to the placeholder location
							Transforms.select(editor, placeholderPath);
							// Remove the placeholder
							Transforms.removeNodes(editor, {
								at: placeholderPath,
								match: (n) =>
									SlateElement.isElement(n) &&
									"type" in n &&
									n.type === "mention-placeholder",
							});
						}
					}
				} catch (error) {
					console.error("Error removing placeholder:", error);
				}

				// Instead of recursively calling insertMention, directly insert the mention node
				try {
					// Prepare the value based on the mention type
					let mentionValue = value;
					if (type === "role") {
						mentionValue = `<@${value}>`;
					} else if (type === "channel") {
						mentionValue = `<#${value}>`;
					} else if (type === "variable") {
						mentionValue = `{${value}}`;
					}

					// Create and insert the mention element with exact typing required
					const mentionElement = {
						type: "mention" as const,
						mentionType: type,
						children: [{ text: "" }] as [{ text: "" }],
						value: mentionValue,
					};

					// Insert at the current selection
					Transforms.insertNodes(editor, mentionElement);

					// Move selection after the inserted mention
					Transforms.move(editor, { unit: "offset" });
				} catch (error) {
					console.error("Error inserting mention element:", error);
				}

				// Explicitly focus the editor and ensure cursor is at the end of content
				setTimeout(() => {
					try {
						// Move to the end of the document
						const point = Editor.end(editor, []);
						Transforms.select(editor, point);

						// Ensure we have focus
						ReactEditor.focus(editor);

						// Additional DOM-level focus to ensure cursor is visible
						try {
							// Force cursor visibility through DOM manipulation
							const domNode = ReactEditor.toDOMNode(editor, editor);
							const selection = window.getSelection();
							if (selection && domNode) {
								// Create a range at the end of the editor content
								const range = document.createRange();
								range.selectNodeContents(domNode);
								range.collapse(false); // collapse to end
								selection.removeAllRanges();

								// Add safeguard before adding range
								if (
									range &&
									typeof range === "object" &&
									"cloneRange" in range
								) {
									try {
										selection.addRange(range);
									} catch (rangeError) {
										console.error(
											"Error adding range to selection:",
											rangeError,
										);
									}
								}

								// Scroll cursor into view if needed
								const editorElement =
									document.querySelector('[role="textbox"]');
								if (editorElement instanceof HTMLElement) {
									editorElement.focus();
								}
							}
						} catch (domError) {
							console.error("DOM-level focus error:", domError);
						}
					} catch (e) {
						console.error("Error positioning cursor after insertion:", e);
						const editorElement = document.querySelector('[role="textbox"]');
						if (editorElement instanceof HTMLElement) {
							editorElement.focus();
						}
					}
				}, 10); // Slightly longer timeout for better reliability
			}

			// Close the popover
			setMentionOpen(false);
			setMentionAnchor(null);
		},
		[],
	);

	// Określamy klasę dla textarea w zależności od liczby wierszy
	const getTextareaClass = () => {
		if (singleLine) {
			return "h-10 min-h-0";
		}

		// Dla multi-line zwracamy odpowiednią klasę wysokości
		if (rows === 1) return "min-h-[24px]";
		if (rows === 2) return "min-h-[48px]";
		if (rows === 3) return "min-h-[72px]";
		if (rows === 4) return "min-h-[96px]";
		if (rows === 5) return "min-h-[120px]";
		return "min-h-[72px]"; // domyślnie 3 wiersze
	};

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem className="w-full flex-1">
					{label && <FormLabel>{label}</FormLabel>}
					<FormControl className="w-full">
						<div className="relative w-full flex-1 rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
							{singleLine ? (
								<div className="flex w-full flex-1">
									<MentionTextarea
										value={field.value}
										onChange={field.onChange}
										className={cn(
											"rounded-md px-3 py-2 text-sm w-full flex-1",
											"h-10 min-h-0",
										)}
										placeholder={placeholder}
										maxLength={maxLength}
										onMentionStart={handleMentionStart}
										onMentionEnd={handleMentionEnd}
										onFocus={handleFocus}
										onBlur={() =>
											handleBlur({} as React.FocusEvent<HTMLElement>)
										}
									/>

									{/* Emoji button */}
									{(isFieldFocused ||
										name.includes("level") ||
										name.includes("welcome_message") ||
										name.includes("leave_message") ||
										emojiPickerOpen) &&
										showEmojiPicker && (
											<div
												className={cn(
													"absolute right-2",
													singleLine ? "top-1/2 -translate-y-1/2" : "top-2",
													emojiPickerOpen
														? "text-primary"
														: "text-muted-foreground hover:text-primary",
												)}
											>
												<Popover
													open={emojiPickerOpen}
													onOpenChange={(open) => {
														setEmojiPickerOpen(open);
														// When closing, ensure focus returns to editor
														if (!open) {
															setTimeout(() => {
																if (commandInputRef.current) {
																	commandInputRef.current.focus();
																}
															}, 50);
														}
													}}
												>
													<PopoverTrigger asChild>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="h-8 w-8"
															data-emoji-button="true"
														>
															<SmileIcon className="h-4 w-4" />
														</Button>
													</PopoverTrigger>
													<PopoverContent
														className="p-0"
														side="top"
														align="end"
													>
														<Command className="w-[320px]">
															<CommandInput
																placeholder="Search emoji..."
																className="h-9"
															/>
															<CommandList className="max-h-[300px]">
																<CommandEmpty>No emoji found</CommandEmpty>
																<CommandGroup>
																	{POPULAR_EMOJIS.map((emoji) => (
																		<CommandItem
																			key={emoji}
																			onSelect={() => {
																				const newValue = field.value
																					? field.value + emoji
																					: emoji;
																				field.onChange(newValue);
																				setEmojiPickerOpen(false);
																				// Focus back on editor after inserting emoji
																				setTimeout(() => {
																					if (commandInputRef.current) {
																						commandInputRef.current.focus();
																					}
																				}, 50);
																			}}
																		>
																			<span className="mr-2 text-lg">
																				{emoji}
																			</span>
																			<span className="text-sm text-muted-foreground">
																				{emoji}
																			</span>
																		</CommandItem>
																	))}
																</CommandGroup>
															</CommandList>
														</Command>
													</PopoverContent>
												</Popover>
											</div>
										)}

									{/* Character counter */}
									{maxLength && (
										<div className="absolute bottom-1 right-2 text-xs text-muted-foreground">
											{characterCount}/{maxLength}
										</div>
									)}

									{/* Popover dla wzmianek */}
									{mentionOpen && mentionAnchor && (
										<Popover
											open={mentionOpen}
											onOpenChange={(open) => {
												if (!open) {
													setMentionOpen(false);
													setMentionAnchor(null);
													savedRangeRef.current = null;

													// Remove any placeholder mentions
													const editor = getEditorInstance("mention-textarea");
													if (editor) {
														try {
															// Find and remove any mention placeholders in the document
															const placeholders = Array.from(
																Editor.nodes(editor, {
																	at: [],
																	match: (n) =>
																		SlateElement.isElement(n) &&
																		"type" in n &&
																		n.type === "mention-placeholder",
																}),
															);

															// If there are any placeholders, remove them
															if (placeholders.length > 0) {
																for (const [
																	_,
																	placeholderPath,
																] of placeholders) {
																	// Remove the placeholder
																	Transforms.removeNodes(editor, {
																		at: placeholderPath,
																		match: (n) =>
																			SlateElement.isElement(n) &&
																			"type" in n &&
																			n.type === "mention-placeholder",
																	});
																}
															}
														} catch (error) {
															console.error(
																"Error removing placeholder:",
																error,
															);
														}

														// Focus the editor
														setTimeout(() => {
															try {
																ReactEditor.focus(editor);
															} catch (e) {
																const editorElement =
																	document.querySelector('[role="textbox"]');
																if (editorElement instanceof HTMLElement) {
																	editorElement.focus();
																}
															}
														}, 0);
													}
												}
											}}
										>
											<PopoverTrigger asChild>
												<div
													className="h-0 w-0 absolute"
													style={{
														left: mentionAnchor.x,
														top: mentionAnchor.y,
														position: "fixed",
														zIndex: 9999,
													}}
												>
													<span className="sr-only">Toggle popover</span>
												</div>
											</PopoverTrigger>
											<PopoverContent
												align="start"
												sideOffset={5}
												className="p-0 w-[220px] bg-white border border-gray-300 shadow-md rounded-md"
											>
												<Command>
													<CommandInput
														ref={commandInputRef}
														value={searchValue}
														onValueChange={setSearchValue}
														placeholder="Search..."
														className="border-none focus:ring-0"
														autoFocus
													/>
													<CommandList>
														<CommandEmpty>No results found</CommandEmpty>
														<CommandGroup>
															{mentionType === "role" &&
																filteredRoles
																	.filter((role) =>
																		role.name
																			.toLowerCase()
																			.includes(searchValue.toLowerCase()),
																	)
																	.map((role) => (
																		<CommandItem
																			key={role.id}
																			value={role.name}
																			onSelect={() => {
																				insertMention(
																					mentionType,
																					role,
																					savedRangeRef.current || undefined,
																				);
																			}}
																		>
																			<div className="flex items-center gap-2">
																				<div
																					className="h-3 w-3 rounded-full"
																					style={{
																						backgroundColor: `#${role.color
																							?.toString(16)
																							.padStart(6, "0")}`,
																					}}
																				/>
																				<span>{role.name}</span>
																			</div>
																		</CommandItem>
																	))}
															{mentionType === "channel" &&
																filteredChannels
																	.filter((channel) =>
																		channel.name
																			.toLowerCase()
																			.includes(searchValue.toLowerCase()),
																	)
																	.map((channel) => (
																		<CommandItem
																			key={channel.id}
																			value={channel.name}
																			onSelect={() => {
																				insertMention(
																					mentionType,
																					channel,
																					savedRangeRef.current || undefined,
																				);
																			}}
																		>
																			<div className="flex items-center gap-2">
																				<span>#</span>
																				<span>{channel.name}</span>
																			</div>
																		</CommandItem>
																	))}
															{mentionType === "variable" && (
																<>
																	{CATEGORIES.map((category) => {
																		// Filter suggestions for this category
																		const categoryItems = SUGGESTIONS.filter(
																			(item) =>
																				item.category === category.id &&
																				item.name
																					.toLowerCase()
																					.includes(searchValue.toLowerCase()),
																		);

																		// Only render category if it has matching items
																		if (categoryItems.length === 0) return null;

																		return (
																			<React.Fragment key={category.id}>
																				<div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
																					<span className="mr-2">
																						{category.icon}
																					</span>
																					{category.name}
																				</div>
																				{categoryItems.map((item) => (
																					<CommandItem
																						key={item.id}
																						value={item.name}
																						onSelect={() => {
																							insertMention(
																								mentionType,
																								item,
																								savedRangeRef.current ||
																									undefined,
																							);
																						}}
																					>
																						<div className="flex flex-col">
																							<span className="font-medium">
																								{item.name}
																							</span>
																							{item.description && (
																								<span className="text-sm text-muted-foreground">
																									{item.description}
																									{item.example &&
																										` (e.g. ${item.example})`}
																								</span>
																							)}
																						</div>
																					</CommandItem>
																				))}
																			</React.Fragment>
																		);
																	})}
																</>
															)}
														</CommandGroup>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
									)}
								</div>
							) : (
								<div className="relative w-full flex-1">
									<MentionTextarea
										value={field.value}
										onChange={field.onChange}
										className={cn(
											"rounded-md px-3 py-2 text-sm w-full flex-1",
											getTextareaClass(),
										)}
										maxLength={maxLength}
										singleLine={singleLine}
										rows={rows}
										showEmojiPicker={false}
										guildId={guildId}
										onMentionStart={handleMentionStart}
										onMentionEnd={handleMentionEnd}
										onFocus={handleFocus}
										onBlur={() =>
											handleBlur({} as React.FocusEvent<HTMLElement>)
										}
									/>

									{/* Emoji button */}
									{(isFieldFocused ||
										name.includes("level") ||
										name.includes("welcome_message") ||
										name.includes("leave_message") ||
										emojiPickerOpen) &&
										showEmojiPicker && (
											<div
												className={cn(
													"absolute right-2",
													singleLine ? "top-1/2 -translate-y-1/2" : "top-2",
													emojiPickerOpen
														? "text-primary"
														: "text-muted-foreground hover:text-primary",
												)}
											>
												<Popover
													open={emojiPickerOpen}
													onOpenChange={(open) => {
														setEmojiPickerOpen(open);
														// When closing, ensure focus returns to editor
														if (!open) {
															setTimeout(() => {
																if (commandInputRef.current) {
																	commandInputRef.current.focus();
																}
															}, 50);
														}
													}}
												>
													<PopoverTrigger asChild>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="h-8 w-8"
															data-emoji-button="true"
														>
															<SmileIcon className="h-4 w-4" />
														</Button>
													</PopoverTrigger>
													<PopoverContent
														className="p-0"
														side="top"
														align="end"
													>
														<Command className="w-[320px]">
															<CommandInput
																placeholder="Search emoji..."
																className="h-9"
															/>
															<CommandList className="max-h-[300px]">
																<CommandEmpty>No emoji found</CommandEmpty>
																<CommandGroup>
																	{Object.entries(emojiCategories).map(
																		([category, emojis]) => (
																			<CommandItem
																				key={category}
																				onSelect={() => {
																					const newValue = field.value
																						? field.value + emojis[0]
																						: emojis[0];
																					field.onChange(newValue);
																					setEmojiPickerOpen(false);
																					// Focus back on editor after inserting emoji
																					setTimeout(() => {
																						if (commandInputRef.current) {
																							commandInputRef.current.focus();
																						}
																					}, 50);
																				}}
																			>
																				<span className="mr-2 text-lg">
																					{emojis[0]}
																				</span>
																				<span className="text-sm text-muted-foreground">
																					{emojis[0]}
																				</span>
																			</CommandItem>
																		),
																	)}
																</CommandGroup>
															</CommandList>
														</Command>
													</PopoverContent>
												</Popover>
											</div>
										)}

									{/* Character counter - bottom right */}
									{maxLength && (
										<div className="absolute bottom-1 right-2 text-xs text-muted-foreground">
											{characterCount}/{maxLength}
										</div>
									)}

									{/* Popover for mentions */}
									{mentionOpen && mentionAnchor && (
										<Popover
											open={mentionOpen}
											onOpenChange={(open) => {
												if (!open) {
													setMentionOpen(false);
													setMentionAnchor(null);
													savedRangeRef.current = null;

													// Remove any placeholder mentions
													const editor = getEditorInstance("mention-textarea");
													if (editor) {
														try {
															// Find and remove any mention placeholders in the document
															const placeholders = Array.from(
																Editor.nodes(editor, {
																	at: [],
																	match: (n) =>
																		SlateElement.isElement(n) &&
																		"type" in n &&
																		n.type === "mention-placeholder",
																}),
															);

															// If there are any placeholders, remove them
															if (placeholders.length > 0) {
																for (const [
																	_,
																	placeholderPath,
																] of placeholders) {
																	// Remove the placeholder
																	Transforms.removeNodes(editor, {
																		at: placeholderPath,
																		match: (n) =>
																			SlateElement.isElement(n) &&
																			"type" in n &&
																			n.type === "mention-placeholder",
																	});
																}
															}
														} catch (error) {
															console.error(
																"Error removing placeholder:",
																error,
															);
														}

														// Focus the editor
														setTimeout(() => {
															try {
																ReactEditor.focus(editor);
															} catch (e) {
																const editorElement =
																	document.querySelector('[role="textbox"]');
																if (editorElement instanceof HTMLElement) {
																	editorElement.focus();
																}
															}
														}, 0);
													}
												}
											}}
										>
											<PopoverTrigger asChild>
												<div
													className="h-0 w-0 absolute"
													style={{
														left: mentionAnchor.x,
														top: mentionAnchor.y,
														position: "fixed",
														zIndex: 9999,
													}}
												/>
											</PopoverTrigger>
											<PopoverContent
												align="start"
												sideOffset={5}
												className="p-0 w-[220px] bg-white border border-gray-300 shadow-md rounded-md"
											>
												<Command>
													<CommandInput
														ref={commandInputRef}
														value={searchValue}
														onValueChange={setSearchValue}
														placeholder="Search..."
														className="border-none focus:ring-0"
														autoFocus
													/>
													<CommandList>
														<CommandEmpty>No results found</CommandEmpty>
														<CommandGroup>
															{mentionType === "role" &&
																filteredRoles
																	.filter((role) =>
																		role.name
																			.toLowerCase()
																			.includes(searchValue.toLowerCase()),
																	)
																	.map((role) => (
																		<CommandItem
																			key={role.id}
																			value={role.name}
																			onSelect={() => {
																				insertMention(
																					mentionType,
																					role,
																					savedRangeRef.current || undefined,
																				);
																			}}
																		>
																			<div className="flex items-center gap-2">
																				<div
																					className="h-3 w-3 rounded-full"
																					style={{
																						backgroundColor: `#${role.color
																							?.toString(16)
																							.padStart(6, "0")}`,
																					}}
																				/>
																				<span>{role.name}</span>
																			</div>
																		</CommandItem>
																	))}
															{mentionType === "channel" &&
																filteredChannels
																	.filter((channel) =>
																		channel.name
																			.toLowerCase()
																			.includes(searchValue.toLowerCase()),
																	)
																	.map((channel) => (
																		<CommandItem
																			key={channel.id}
																			value={channel.name}
																			onSelect={() => {
																				insertMention(
																					mentionType,
																					channel,
																					savedRangeRef.current || undefined,
																				);
																			}}
																		>
																			<div className="flex items-center gap-2">
																				<span>#</span>
																				<span>{channel.name}</span>
																			</div>
																		</CommandItem>
																	))}
															{mentionType === "variable" && (
																<>
																	{CATEGORIES.map((category) => {
																		// Filter suggestions for this category
																		const categoryItems = SUGGESTIONS.filter(
																			(item) =>
																				item.category === category.id &&
																				item.name
																					.toLowerCase()
																					.includes(searchValue.toLowerCase()),
																		);

																		// Only render category if it has matching items
																		if (categoryItems.length === 0) return null;

																		return (
																			<React.Fragment key={category.id}>
																				<div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
																					<span className="mr-2">
																						{category.icon}
																					</span>
																					{category.name}
																				</div>
																				{categoryItems.map((item) => (
																					<CommandItem
																						key={item.id}
																						value={item.name}
																						onSelect={() => {
																							insertMention(
																								mentionType,
																								item,
																								savedRangeRef.current ||
																									undefined,
																							);
																						}}
																					>
																						<div className="flex flex-col">
																							<span className="font-medium">
																								{item.name}
																							</span>
																							{item.description && (
																								<span className="text-sm text-muted-foreground">
																									{item.description}
																									{item.example &&
																										` (e.g. ${item.example})`}
																								</span>
																							)}
																						</div>
																					</CommandItem>
																				))}
																			</React.Fragment>
																		);
																	})}
																</>
															)}
														</CommandGroup>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
									)}
								</div>
							)}
						</div>
					</FormControl>
					{description && <FormDescription>{description}</FormDescription>}
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
