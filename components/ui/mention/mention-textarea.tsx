"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { Descendant } from "slate";
import {
	Editor,
	Transforms,
	Text,
	Element as SlateElement,
	createEditor,
} from "slate";
import { Slate, Editable, withReact, ReactEditor } from "slate-react";
import { withHistory } from "slate-history";
import { useParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { getCachedData } from "@/lib/cache";
import type { GuildData } from "@/types/guild";
import { getUser } from "@/hooks/use-user";
import { globalVariables } from "@/lib/variables";
import { VariableMention } from "./variable-mention";
import type {
	CustomText,
	Channel,
	MentionType,
	MentionElement,
	MentionPlaceholderElement,
	ParagraphElement,
	WindowWithEditors,
} from "./types";
import type { Variable } from "@/components/ui/mention/mention-popover";

import { Popover, PopoverContent } from "@/components/ui/popover";
import {
	Command,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from "@/components/ui/command";

import type * as Discord from "discord.js";

export interface Category {
	id: string;
	name: string;
	icon?: string;
}

// The props for your final MentionTextarea
export interface MentionTextareaProps {
	value?: string; // The editor content as HTML
	onChange?: (html: string) => void;
	placeholder?: string;
	className?: string;
	style?: React.CSSProperties;
	maxLength?: number;
	singleLine?: boolean;
	showEmojiPicker?: boolean;
	showSuggestions?: boolean;
	rows?: number;
	variables?: Variable[];
	categories?: Category[];
	id?: string; // Unikalny identyfikator dla edytora
	// Optionally handle external mention popover triggers
	onMentionStart?: (data: {
		type: MentionType;
		search: string;
		domRect: DOMRect;
	}) => void;
	onMentionEnd?: () => void;
	onFocus?: () => void;
	onBlur?: (e: React.FocusEvent<HTMLDivElement>) => void;
}

// A minimal "cache" for deserialization results to avoid repeated parsing:
const deserializationCache = new Map<string, ParagraphElement[]>();

// A single empty paragraph to initialize the editor
const EMPTY_VALUE: ParagraphElement[] = [
	{ type: "paragraph", children: [{ text: "" }] },
];

// Define an extended type for our editor to avoid 'any'
interface ExtendedEditor extends ReactEditor {
	__initialized?: boolean;
	__lastReset?: number;
}

// Add this near the top of the file outside of components to create a proper editor instance cache
// This prevents creating multiple instances of the same editor
const editorInstanceCache: Record<string, ExtendedEditor> = {};

// Add a processing token system to prevent repeated processing
const processedContentTokens = new Set<string>();

// Add a reset cooldown tracker to prevent rapid resets
const lastResetTimestamps: Record<string, number> = {};
const RESET_COOLDOWN_MS = 2000; // 2 seconds cooldown between resets

// The main component
export function MentionTextarea({
	value = "",
	onChange,
	placeholder = "Type something...",
	className,
	style,
	maxLength,
	singleLine,
	rows = 3,
	onMentionStart,
	onMentionEnd,
	onFocus,
	onBlur,
	showEmojiPicker = false,
	id = "mention-textarea", // Domyślny identyfikator
}: MentionTextareaProps) {
	// Get guildId from URL params
	const params = useParams();
	const guildId = params.id as string;

	// Add ref for the editor container
	const editorRef = useRef<HTMLDivElement>(null);

	// Add ref to track if component is mounted
	const isMounted = useRef(true);

	// Roles and channels from localStorage
	const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
	const [channels, setChannels] = useState<Array<Channel>>([]);
	const [botData, setBotData] = useState<Discord.User | null>(null);

	// Track if the editor is currently being edited
	const [isEditing, setIsEditing] = useState(false);

	// Store the last value to prevent loss during tab switching
	const lastValueRef = useRef(value);

	// Track the initial mount to avoid unnecessary resets
	const initialMountRef = useRef(true);

	useEffect(() => {
		// Set mounted flag
		isMounted.current = true;
		initialMountRef.current = true;

		// Cleanup function
		return () => {
			isMounted.current = false;
			// Don't remove the editor instance from cache - we want to preserve it
			// However, we should mark it as potentially stale
			if (editorInstanceCache[id]) {
				console.log(
					`Editor ${id} component unmounted, instance preserved in cache`,
				);
			}
		};
	}, [id]);

	/** Create or reuse the Slate editor instance for this id. */
	const editor = useMemo(() => {
		// Check if we already have an editor instance for this id
		if (editorInstanceCache[id]) {
			console.log(`Reusing existing editor instance for id: ${id}`);
			return editorInstanceCache[id];
		}

		// Otherwise create a new one
		console.log(`Creating new editor instance for id: ${id}`);
		const newEditor = withHistory(withReact(createEditor())) as ExtendedEditor;

		// Extend `isVoid` and `isInline` for mention elements
		const { isVoid, isInline } = newEditor;
		newEditor.isVoid = (element) => {
			return element.type === "mention" ||
				element.type === "mention-placeholder"
				? true
				: isVoid(element);
		};
		newEditor.isInline = (element) => {
			return element.type === "mention" ||
				element.type === "mention-placeholder"
				? true
				: isInline(element);
		};

		// Store in our cache
		editorInstanceCache[id] = newEditor;
		return newEditor;
	}, [id]); // Only recreate if id changes

	// Improve the initialization process to make it more reliable
	useEffect(() => {
		// When the component mounts, initialize it with the stored value
		if (isMounted.current && editor) {
			// Ensure we start with a clean slate
			try {
				// If it's a fresh editor (newly created), set its content from props
				const currentEditor = editorInstanceCache[id];
				if (currentEditor && !currentEditor.__initialized) {
					console.log(`Initializing editor ${id} for the first time`);

					// Use the provided value or lastValueRef if available
					const contentToUse = value || lastValueRef.current || "";

					// Parse the content into Slate nodes
					const initialContent = deserializeHtml(contentToUse, singleLine);

					// Set the editor content
					editor.children = initialContent as unknown as Descendant[];
					editor.onChange();

					// Mark this editor as initialized
					currentEditor.__initialized = true;

					// If it's a new editor and we're setting its initial content,
					// don't trigger onChange to avoid circular updates
					lastValueRef.current = contentToUse;
				}
			} catch (error) {
				console.error(`Error initializing editor ${id}:`, error);
			}
		}
	}, [editor, id, value, singleLine]);

	// Add special handling for tab focus to ensure the editor maintains focus
	useEffect(() => {
		const handleFocusLoss = () => {
			// When the window loses focus, make sure we save the current state
			if (editor?.children && isEditing) {
				try {
					const currentValue = serializeToHtml(
						editor.children as Descendant[],
						{
							roles,
							channels,
							botId: botData?.id,
							botName: botData?.username,
						},
						singleLine,
					);

					if (currentValue) {
						console.log(`Saving content on window blur for ${id}`);
						lastValueRef.current = currentValue;
					}
				} catch (err) {
					console.error(
						`Error saving editor state on window blur for ${id}:`,
						err,
					);
				}
			}
		};

		window.addEventListener("blur", handleFocusLoss);

		return () => {
			window.removeEventListener("blur", handleFocusLoss);
		};
	}, [editor, id, isEditing, roles, channels, botData, singleLine]);

	// Make sure this effect only runs after the editor is initialized
	useEffect(() => {
		// If a new value is provided via props and it's different from what we have,
		// AND not during initialization, update the editor
		if (!editor) return;

		// If a new value is provided via props and it's different from what we have,
		// AND not during initialization, update the editor
		const currentEditor = editorInstanceCache[id];
		if (
			value &&
			value !== lastValueRef.current &&
			!initialMountRef.current &&
			currentEditor &&
			currentEditor.__initialized
		) {
			console.log(`New value prop received for ${id}, updating content`);

			try {
				// Parse the new content into Slate nodes
				const newContent = deserializeHtml(value, singleLine);

				// Only update if the content is actually different
				const currentEditorHtml = serializeToHtml(
					editor.children as Descendant[],
					{
						roles,
						channels,
						botId: botData?.id,
						botName: botData?.username,
					},
					singleLine,
				);

				if (currentEditorHtml !== value) {
					// Set the editor content
					editor.children = newContent as unknown as Descendant[];
					editor.onChange();

					// Update our reference
					lastValueRef.current = value;
				}
			} catch (error) {
				console.error(`Error updating editor ${id} from props:`, error);
			}
		}
	}, [value, id, editor, singleLine, roles, channels, botData]);

	// Track tab visibility to handle editor state properly
	const [isTabVisible, setIsTabVisible] = useState(true);
	const [needsReset, setNeedsReset] = useState(false);
	// Add flag to track if we're currently in a reset process
	const isResettingRef = useRef(false);

	// Add a useEffect to handle tab switching and preserve editor state
	useEffect(() => {
		// When component is mounted, restore from lastValueRef if needed
		if (isMounted.current && lastValueRef.current) {
			// Only update if the current value is empty but we have a stored value
			if (!value && lastValueRef.current) {
				onChange?.(lastValueRef.current);
			}
		}

		// Add event listeners for tab visibility changes
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				setIsTabVisible(true);
				// Don't trigger reset automatically - user will need to interact again
			} else {
				setIsTabVisible(false);
				// Just save state without complex processing
				if (editor.children && isEditing) {
					try {
						const currentValue = serializeToHtml(
							editor.children as Descendant[],
							{
								roles,
								channels,
								botId: botData?.id,
								botName: botData?.username,
							},
							singleLine,
						);
						if (currentValue) {
							lastValueRef.current = currentValue;
						}
					} catch (err) {
						console.error(`Error saving editor state:`, err);
					}
				}
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [
		value,
		onChange,
		editor,
		roles,
		channels,
		botData,
		singleLine,
		isEditing,
		id,
	]);

	// Completely disable the reset mechanism
	useEffect(() => {
		if (isTabVisible && needsReset && isMounted.current) {
			// Instead of performing a complex reset, simply mark as not needing reset
			console.log("Reset mechanism disabled to prevent loops");
			setNeedsReset(false);
		}
	}, [isTabVisible, needsReset]);

	// Add a MutationObserver to detect when the editor is removed from DOM and added back
	useEffect(() => {
		if (typeof window === "undefined" || !editorRef.current) return;

		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === "childList") {
					// Check if our editor was removed and added back (tab switching)
					if (
						mutation.addedNodes.length > 0 &&
						// Only set needsReset if we're not already in the process of resetting
						!needsReset &&
						isTabVisible
					) {
						// Element was added back to DOM
						// Use setTimeout to defer the state update until after render is complete
						setTimeout(() => {
							if (isMounted.current) {
								setNeedsReset(true);
							}
						}, 0);
					}
				}
			}
		});

		// Start observing the parent of our editor
		if (editorRef.current.parentElement) {
			observer.observe(editorRef.current.parentElement, {
				childList: true,
				subtree: true,
			});
		}

		return () => {
			observer.disconnect();
		};
	}, [needsReset, isTabVisible]);

	useEffect(() => {
		const fetchBotData = async () => {
			try {
				const botData = await getUser(process.env.NEXT_PUBLIC_BOT_ID || "");
				if (botData && isMounted.current) {
					setBotData(botData);
				}
			} catch (err) {
				console.error("Failed to load bot data:", err);
			}
		};
		fetchBotData();
	}, []);

	/** Load guild data from localStorage on mount */
	useEffect(() => {
		try {
			const cacheKey = `guild-${guildId}`;
			const cached = getCachedData<GuildData>(cacheKey);

			if (cached?.data && isMounted.current) {
				setRoles(cached.data.roles || []);
				// Filter out category channels (type 4 is GUILD_CATEGORY) and ensure type is defined
				const nonCategoryChannels = (cached.data.channels || []).filter(
					(channel): channel is Channel => {
						return typeof channel.type === "number" && channel.type !== 4;
					},
				);
				setChannels(nonCategoryChannels);
			} else {
				console.log("No cached data found or data is invalid");
			}
		} catch (err) {
			console.error("Failed to load guild data from local cache:", err);
		}
	}, [guildId]);

	/** Expose this editor instance globally so we can do programmatic insertions. */
	useEffect(() => {
		if (typeof window !== "undefined") {
			const typedWindow = window as WindowWithEditors;
			if (!typedWindow.__slateEditorInstances) {
				typedWindow.__slateEditorInstances = {};
			}
			// Używamy id jako klucza, aby każdy edytor miał własny kontekst
			typedWindow.__slateEditorInstances[id] = editor;

			// Cleanup function to remove the editor instance when component unmounts
			return () => {
				if (typedWindow.__slateEditorInstances?.[id]) {
					delete typedWindow.__slateEditorInstances[id];
				}
			};
		}
	}, [editor, id]);

	/** Simplify the initial value logic to avoid reprocessing */
	const initialValue = useMemo(() => {
		if (!value && !lastValueRef.current) return [...EMPTY_VALUE];

		// Use the last value if current value is empty (helps during tab switching)
		const contentToProcess = value || lastValueRef.current;

		// If it's the same as last time, use cached result if available
		const cacheKey = `${id}:${contentToProcess}`;
		if (
			contentToProcess === lastValueRef.current &&
			deserializationCache.has(cacheKey)
		) {
			return deserializationCache.get(cacheKey) || [...EMPTY_VALUE];
		}

		// Store for future reference
		lastValueRef.current = contentToProcess;

		// Parse the HTML directly
		const result = deserializeHtml(contentToProcess, singleLine);
		deserializationCache.set(cacheKey, result);
		return result;
	}, [value, id, singleLine]);

	/** Simplify the editor change handler */
	const handleEditorChange = useCallback(
		(newValue: Descendant[]) => {
			// Only process changes if component is mounted
			if (!isMounted.current) return;

			// Convert to HTML with transformation options
			const html = serializeToHtml(
				newValue,
				{
					roles,
					channels,
					botId: botData?.id,
					botName: botData?.username,
				},
				singleLine,
			);

			// Check length if maxLength is given
			if (maxLength !== undefined && maxLength > 0) {
				const plainText = html.replace(/<[^>]*>/g, "");
				if (plainText.length > maxLength) return;
			}

			// Only update if value changed
			if (html !== lastValueRef.current) {
				lastValueRef.current = html;

				// Call onChange with minimum delay
				if (onChange) {
					onChange(html);
				}
			}
		},
		[maxLength, onChange, roles, channels, botData, singleLine],
	);

	/** Keep track of focus so we can style the container if needed. */
	const [focused, setFocused] = useState(false);
	const handleFocus = useCallback(() => {
		setFocused(true);
		setIsEditing(true);

		// Przy uzyskaniu focusu, sprawdź czy potrzebne jest zresetowanie edytora
		if (needsReset && lastValueRef.current) {
			try {
				// Zresetuj edytor z ostatnią znaną wartością
				const resetValue = deserializeHtml(lastValueRef.current, singleLine);

				// Całkowicie czyścimy edytor przed ustawieniem nowej wartości
				Transforms.deselect(editor);
				Transforms.delete(editor, {
					at: {
						anchor: Editor.start(editor, []),
						focus: Editor.end(editor, []),
					},
				});

				// Ustawiamy nową wartość
				editor.children = resetValue as unknown as Descendant[];
				editor.onChange();
			} catch (error) {
				console.error("Error resetting editor on focus:", error);
			}
			setNeedsReset(false);
		}

		onFocus?.();
	}, [onFocus, editor, needsReset, singleLine]);

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLDivElement>) => {
			setFocused(false);

			// Ensure we save the current state before losing focus
			const currentValue = serializeToHtml(
				editor.children as Descendant[],
				{
					roles,
					channels,
					botId: botData?.id,
					botName: botData?.username,
				},
				singleLine,
			);

			if (currentValue) {
				lastValueRef.current = currentValue;
				// Use setTimeout to defer the state update until after render is complete
				setTimeout(() => {
					if (isMounted.current && onChange) {
						onChange(currentValue);
					}
				}, 0);
			}

			// Small delay to ensure any pending changes are processed
			setTimeout(() => {
				if (isMounted.current) {
					setIsEditing(false);
				}
			}, 100);
			onBlur?.(e);
		},
		[onBlur, editor, roles, channels, botData, onChange, singleLine],
	);

	// Add useEffect to handle initial focus
	useEffect(() => {
		if (editorRef.current) {
			const editable = editorRef.current.querySelector(
				'[contenteditable="true"]',
			);
			if (editable instanceof HTMLElement) {
				editable.focus();
			}
		}
	}, []);

	// Add state for mention popover
	const [mentionPopover, setMentionPopover] = useState<{
		type: MentionType;
		search: string;
		rect?: DOMRect;
	} | null>(null);

	// Update handleKeyDown to use local state
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			// If single line and press Enter, prevent new line:
			if (singleLine && e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				return;
			}

			// If pressing Escape and we have a mention popover open, close it
			if (e.key === "Escape" && mentionPopover) {
				e.preventDefault();
				// Remove any existing mention placeholders
				try {
					const [placeholderEntry] = Editor.nodes(editor, {
						match: (n) =>
							SlateElement.isElement(n) && n.type === "mention-placeholder",
					});

					if (placeholderEntry) {
						const [_, path] = placeholderEntry;
						Transforms.removeNodes(editor, { at: path });
					}
				} catch (err) {
					console.error("Error removing placeholder:", err);
				}
				setMentionPopover(null);
				onMentionEnd?.();
				return;
			}

			// Basic mention triggers (@, #, {)
			if (["@", "#", "{"].includes(e.key)) {
				e.preventDefault();
				const domSel = window.getSelection();
				if (domSel && domSel.rangeCount > 0) {
					const range = domSel.getRangeAt(0);
					const rect = range.getBoundingClientRect();

					let mentionType: MentionType = "variable";
					if (e.key === "@") mentionType = "role";
					if (e.key === "#") mentionType = "channel";

					// Get the current selection
					const { selection } = editor;
					if (!selection) return;

					// Insert a new placeholder with the trigger character
					Transforms.insertNodes(editor, {
						type: "mention-placeholder",
						mentionType,
						children: [{ text: "" }],
					});

					// Update local state
					setMentionPopover({
						type: mentionType,
						search: "",
						rect,
					});

					// Also call external handler if provided
					onMentionStart?.({
						type: mentionType,
						search: "",
						domRect: rect,
					});
				}
			}
		},
		[singleLine, onMentionStart, onMentionEnd, editor, mentionPopover],
	);

	/**
	 * Basic function to compute a min-height style based on rows.
	 * (You could also do a more elaborate approach if you prefer.)
	 */
	const computeMinHeight = useMemo(() => {
		if (!rows || singleLine) return undefined;
		const lineHeightPx = 24; // approximate line-height
		return rows * lineHeightPx;
	}, [rows, singleLine]);

	// Combine our classes
	const editorClasses = cn(
		"w-full border border-input rounded-md bg-background text-sm",
		singleLine ? "h-10 overflow-y-hidden overflow-x-auto" : "overflow-y-auto",
		"px-3 py-2",
		focused ? "ring-1 ring-ring" : "",
		"focus:outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
		className,
	);

	// When cleaning up editorRef, also remove editor from the instance cache:
	useEffect(() => {
		return () => {
			// When component completely unmounts (not just tab switching),
			// we should clean up the editor instance cache to prevent memory leaks
			if (id && !document.getElementById(id)) {
				// Use setTimeout to ensure this only happens after the component is fully unmounted
				setTimeout(() => {
					if (editorInstanceCache[id] && !document.getElementById(id)) {
						console.log(`Cleaning up editor instance for id: ${id}`);
						delete editorInstanceCache[id];
					}
				}, 5000); // Wait 5 seconds to make sure it's not just a tab switch
			}
		};
	}, [id]);

	return (
		<div
			ref={editorRef}
			className="relative w-full focus-within:outline-none"
			onFocus={handleFocus}
			onBlur={handleBlur}
		>
			<Slate
				editor={editor}
				initialValue={initialValue as Descendant[]}
				onChange={handleEditorChange}
			>
				<Editable
					className={editorClasses}
					style={{ ...style, minHeight: computeMinHeight }}
					placeholder={placeholder}
					autoCorrect="off"
					spellCheck
					onKeyDown={handleKeyDown}
					renderElement={(props) => (
						<MentionElementRenderer
							{...props}
							element={props.element as unknown as RenderElement}
							roles={roles}
							channels={channels}
						/>
					)}
				/>
			</Slate>

			{mentionPopover && (
				<Popover
					open={true}
					onOpenChange={(open) => {
						if (!open) {
							try {
								const [placeholderEntry] = Editor.nodes(editor, {
									match: (n) =>
										SlateElement.isElement(n) &&
										n.type === "mention-placeholder",
								});

								if (placeholderEntry) {
									const [node, path] = placeholderEntry;
									// Just remove the placeholder when closing without selection
									Transforms.removeNodes(editor, { at: path });
									ReactEditor.focus(editor);
								}
							} catch (err) {
								console.error("Error removing placeholder:", err);
							}
							setMentionPopover(null);
							onMentionEnd?.();
						}
					}}
				>
					<PopoverContent
						className="w-[200px] p-0"
						style={{
							position: "absolute",
							top: mentionPopover.rect
								? `${mentionPopover.rect.bottom + window.scrollY}px`
								: "0",
							left: mentionPopover.rect
								? `${mentionPopover.rect.left + window.scrollX}px`
								: "0",
						}}
					>
						<Command>
							<CommandInput
								placeholder={`Search ${mentionPopover.type}s...`}
								onKeyDown={(e) => {
									if (e.key === "Escape") {
										e.preventDefault();
										e.stopPropagation();
										setMentionPopover(null);
										onMentionEnd?.();
									}
								}}
							/>
							<CommandList>
								<CommandEmpty>No results found.</CommandEmpty>
								{mentionPopover.type === "role" && (
									<CommandGroup>
										{roles.map((role) => (
											<CommandItem
												key={role.id}
												onSelect={() => {
													try {
														const [placeholderEntry] = Editor.nodes(editor, {
															match: (n) =>
																SlateElement.isElement(n) &&
																n.type === "mention-placeholder",
														});

														if (placeholderEntry) {
															const [node, path] = placeholderEntry;

															// Replace the placeholder with mention in a single operation
															Transforms.setNodes<MentionElement>(
																editor,
																{
																	type: "mention",
																	mentionType: "role",
																	value: `<@&${role.id}>`,
																	displayValue: `@${role.name}`,
																	children: [{ text: "" }],
																} as MentionElement,
																{ at: path },
															);

															// Move cursor after the mention
															const after = Editor.after(editor, path);
															if (after) {
																Transforms.select(editor, after);
																ReactEditor.focus(editor);
															}
														}
													} catch (err) {
														console.error(
															"Error handling mention selection:",
															err,
														);
													}
													setMentionPopover(null);
												}}
											>
												@{role.name}
											</CommandItem>
										))}
									</CommandGroup>
								)}
								{mentionPopover.type === "channel" && (
									<CommandGroup>
										{channels.map((channel) => (
											<CommandItem
												key={channel.id}
												onSelect={() => {
													try {
														const [placeholderEntry] = Editor.nodes(editor, {
															match: (n) =>
																SlateElement.isElement(n) &&
																n.type === "mention-placeholder",
														});

														if (placeholderEntry) {
															const [node, path] = placeholderEntry;

															// Replace the placeholder with mention in a single operation
															Transforms.setNodes<MentionElement>(
																editor,
																{
																	type: "mention",
																	mentionType: "channel",
																	value: `<#${channel.id}>`,
																	displayValue: `#${channel.name}`,
																	children: [{ text: "" }],
																} as MentionElement,
																{ at: path },
															);

															// Move cursor after the mention
															const after = Editor.after(editor, path);
															if (after) {
																Transforms.select(editor, after);
																ReactEditor.focus(editor);
															}
														}
													} catch (err) {
														console.error(
															"Error handling mention selection:",
															err,
														);
													}
													setMentionPopover(null);
												}}
											>
												#{channel.name}
											</CommandItem>
										))}
									</CommandGroup>
								)}
								{mentionPopover.type === "variable" &&
									Object.entries(
										globalVariables.reduce<Record<string, Variable[]>>(
											(acc, variable) => {
												const category = variable.category || "Other";
												if (!acc[category]) {
													acc[category] = [];
												}
												acc[category].push(variable);
												return acc;
											},
											{},
										),
									).map(([category, variables]) => (
										<CommandGroup key={category} heading={category}>
											{variables.map((variable) => (
												<VariableMention
													key={variable.id}
													variable={variable}
													editor={editor}
													onSelect={() => setMentionPopover(null)}
												/>
											))}
										</CommandGroup>
									))}
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
}

/* -------------------------------------------------------------
   RENDER: MENTION ELEMENT
   ------------------------------------------------------------- */
type RenderElement =
	| {
			type: "mention";
			mentionType: MentionType;
			value: string;
			displayValue: string;
			children: [{ text: string }];
	  }
	| {
			type: "mention-placeholder";
			mentionType: MentionType;
			children: [{ text: string }];
	  }
	| {
			type: "paragraph";
			children: Array<CustomText | MentionElement | MentionPlaceholderElement>;
	  };

function MentionElementRenderer({
	element,
	attributes,
	children,
	roles,
	channels,
}: {
	element: RenderElement;
	attributes: React.HTMLAttributes<HTMLElement>;
	children: React.ReactNode;
	roles: Array<{ id: string; name: string }>;
	channels: Array<Channel>;
}) {
	if (element.type === "mention") {
		const mention = element as MentionElement;
		let displayText = mention.displayValue;
		let mentionStyle = "bg-purple-100 text-purple-800 border-purple-300";

		// console.log("Rendering mention:", {
		// 	type: mention.mentionType,
		// 	value: mention.value,
		// 	displayValue: mention.displayValue,
		// 	availableChannels: channels,
		// 	availableRoles: roles,
		// });

		if (mention.mentionType === "role") {
			mentionStyle = "bg-blue-100 text-blue-800 border-blue-300";
			if (mention.value.startsWith("<@")) {
				// Extract role ID and find role name
				const roleId = mention.value.match(/<@&?(\d+)>/)?.[1];
				if (roleId) {
					const role = roles.find((r) => r.id === roleId);
					if (role) {
						displayText = `@${role.name}`;
					}
				}
			} else if (mention.value.startsWith("<id:")) {
				// Handle <id:customize> format for roles
				const id = mention.value.slice(4, -1);
				if (id.toLowerCase() === "customize") {
					displayText = "Roles & Channels";
					mentionStyle = "bg-green-100 text-green-800 border-green-300"; // Use channel styling
				} else {
					const role = roles.find(
						(r) => r.id === id || r.name.toLowerCase() === id.toLowerCase(),
					);
					if (role) {
						displayText = `@${role.name}`;
					}
				}
			}
		} else if (mention.mentionType === "channel") {
			mentionStyle = "bg-green-100 text-green-800 border-green-300";
			if (mention.value.startsWith("<#")) {
				// Extract channel ID and find channel name
				const channelId = mention.value.match(/<#(\d+)>/)?.[1];
				if (channelId) {
					const channel = channels.find((c) => c.id === channelId);
					if (channel) {
						displayText = `#${channel.name}`;
					}
				}
			} else if (mention.value.startsWith("<id:")) {
				// Handle <id:customize> format for channels
				const id = mention.value.slice(4, -1);
				if (id.toLowerCase() === "customize") {
					displayText = "Roles & Channels";
				} else {
					const channel = channels.find(
						(c) => c.id === id || c.name.toLowerCase() === id.toLowerCase(),
					);
					if (channel) {
						displayText = `#${channel.name}`;
					}
				}
			}
		} else if (
			mention.mentionType === "variable" &&
			mention.value.startsWith("{") &&
			mention.value.endsWith("}")
		) {
			displayText = mention.value.slice(1, -1);
		}

		return (
			<span
				{...attributes}
				contentEditable={false}
				className={cn(
					"rounded-md px-1 py-0.5 text-md select-all border",
					mentionStyle,
				)}
				data-mention-type={mention.mentionType}
				data-value={mention.value}
			>
				{/* Hide actual children from user (Slates internal text node) */}
				<span style={{ display: "none" }}>{children}</span>
				{displayText}
			</span>
		);
	}

	if (element.type === "mention-placeholder") {
		// E.g. user typed "@" but hasn't chosen a mention yet
		const placeholder = element as MentionPlaceholderElement;
		const placeholderIcon =
			placeholder.mentionType === "role"
				? "@"
				: placeholder.mentionType === "channel"
					? "#"
					: "{";

		const placeholderStyle =
			placeholder.mentionType === "role"
				? "bg-blue-100 text-blue-800 border-blue-300"
				: placeholder.mentionType === "channel"
					? "bg-green-100 text-green-800 border-green-300"
					: "bg-purple-100 text-purple-800 border-purple-300";

		return (
			<span
				{...attributes}
				contentEditable={false}
				className={cn(
					"rounded-md px-1 py-0.5 text-md select-all border",
					placeholderStyle,
				)}
				data-mention-placeholder
			>
				<span style={{ display: "none" }}>{children}</span>
				{placeholderIcon}
			</span>
		);
	}

	// Handle formatted text
	const text = Text.isText(element) ? element.text : "";
	if (text.match(/(\*\*|__)(.*?)\1/)) {
		// Bold
		return <strong {...attributes}>{children}</strong>;
	}
	if (text.match(/(\*|_)(.*?)\1/)) {
		// Italic
		return <em {...attributes}>{children}</em>;
	}
	if (text.match(/`([^`]+)`/)) {
		// Inline code
		return (
			<code {...attributes} className="bg-gray-100 px-1 rounded font-mono">
				{children}
			</code>
		);
	}
	if (text.match(/~~(.*?)~~/)) {
		// Strikethrough
		return <del {...attributes}>{children}</del>;
	}
	if (text.match(/__(.*?)__/)) {
		// Underline
		return <u {...attributes}>{children}</u>;
	}
	if (text.match(/^> /)) {
		// Blockquote
		return (
			<blockquote {...attributes} className="border-l-4 border-gray-300 pl-4">
				{children}
			</blockquote>
		);
	}
	if (text.match(/^[*-] /)) {
		// Unordered list item
		return <li {...attributes}>{children}</li>;
	}
	if (text.match(/^\d+\. /)) {
		// Ordered list item
		return <li {...attributes}>{children}</li>;
	}

	// Default: paragraph or other
	return <p {...attributes}>{children}</p>;
}

/* -------------------------------------------------------------
   SERIALIZE: from Slate -> HTML
   ------------------------------------------------------------- */
function serializeToHtml(
	nodes: Descendant[],
	transformOptions: TransformOptions = {},
	singleLine = false,
): string {
	// Add a defensive check for empty nodes
	if (!nodes || nodes.length === 0) {
		console.log("serializeToHtml received empty nodes array");
		return "";
	}

	let result = nodes
		.map((node) => {
			if (Text.isText(node)) {
				return transformText(node.text, transformOptions);
			}
			if (SlateElement.isElement(node)) {
				switch (node.type) {
					case "mention": {
						const mention = node as MentionElement;
						const safeValue = (mention.value || "").trim(); // Trim the value to remove newlines

						// IMPORTANT: Sanitize the mention value to prevent HTML corruption
						// This is critical for preventing content corruption during serialization
						const sanitizedValue = safeValue
							.replace(/</g, "&lt;")
							.replace(/>/g, "&gt;")
							.replace(/"/g, "&quot;")
							.replace(/'/g, "&#039;");

						// Transform mentions using the same logic as display
						let displayValue = safeValue;
						if (
							mention.mentionType === "channel" &&
							safeValue.startsWith("<#")
						) {
							const channelId = safeValue.match(/<#(\d+)>/)?.[1];
							if (channelId) {
								const channel = transformOptions.channels?.find(
									(c) => c.id === channelId,
								);
								if (channel) {
									displayValue = `#${channel.name}`;
								}
							}
						} else if (
							mention.mentionType === "role" &&
							safeValue.startsWith("<@")
						) {
							const roleId = safeValue.match(/<@&?(\d+)>/)?.[1];
							if (roleId) {
								const role = transformOptions.roles?.find(
									(r) => r.id === roleId,
								);
								if (role) {
									displayValue = `@${role.name}`;
								}
							}
						} else if (safeValue.startsWith("<id:")) {
							const id = safeValue.slice(4, -1);
							if (id.toLowerCase() === "customize") {
								displayValue = "Roles & Channels";
							}
						} else if (
							mention.mentionType === "variable" &&
							safeValue.startsWith("{")
						) {
							displayValue = safeValue.slice(1, -1);
						}

						// Sanitize the display value too
						const sanitizedDisplay = displayValue
							.replace(/</g, "&lt;")
							.replace(/>/g, "&gt;")
							.replace(/"/g, "&quot;")
							.replace(/'/g, "&#039;");

						// Use the sanitized values to prevent corruption
						return `<span data-type="mention" data-value="${sanitizedValue}" contenteditable="false">${sanitizedDisplay}</span>`;
					}
					case "paragraph":
						// For single-line inputs, don't wrap content in paragraph tags
						if (singleLine) {
							return serializeToHtml(
								node.children,
								transformOptions,
								singleLine,
							);
						}
						return `<p>${serializeToHtml(node.children, transformOptions, singleLine)}</p>\n`;
					case "mention-placeholder": {
						const m = node as MentionPlaceholderElement;
						const safeValue = (m.children[0]?.text || "").trim();
						return `<span data-type="mention-placeholder" data-value="${safeValue}"></span>`;
					}
					default: {
						const unknownElement = node as { children?: Descendant[] };
						return unknownElement.children
							? serializeToHtml(
									unknownElement.children,
									transformOptions,
									singleLine,
								)
							: "";
					}
				}
			}
			return "";
		})
		.join("");

	// For single-line inputs, ensure we don't have any paragraph tags
	if (singleLine) {
		// Remove any paragraph tags that might have been added
		result = result.replace(/<\/?p>/g, "");
	}

	return result;
}

/* -------------------------------------------------------------
   DESERIALIZE: from HTML -> Slate
   ------------------------------------------------------------- */
function deserializeHtml(html: string, singleLine = false): ParagraphElement[] {
	// If the input is empty, return an empty paragraph
	if (!html || html.trim() === "") {
		return [{ type: "paragraph", children: [{ text: "" }] }];
	}

	// Process the HTML minimally
	let processedHtml = html;
	if (singleLine) {
		processedHtml = processedHtml.replace(/<\/?p>/g, "");
	}

	// Create a DOM element to parse
	const div = document.createElement("div");
	div.innerHTML = processedHtml;

	const result: ParagraphElement[] = [];
	let currentParagraph: ParagraphElement = { type: "paragraph", children: [] };

	// Process all nodes
	for (const node of div.childNodes) {
		processNode(node);
	}

	// Add the last paragraph if it has content
	if (currentParagraph.children.length > 0) {
		result.push(currentParagraph);
	}

	// Ensure we have at least one paragraph
	if (result.length === 0) {
		result.push({ type: "paragraph", children: [{ text: "" }] });
	}

	return result;

	// Functions processText and processNode remain the same
	function processText(text: string): Array<CustomText | MentionElement> {
		const result: Array<CustomText | MentionElement> = [];
		let remainingText = text;

		// Define patterns for different mention types
		const patterns = [
			{ regex: /<@&(\d+)>/g, type: "role" as MentionType },
			{ regex: /<#(\d+)>/g, type: "channel" as MentionType },
			{ regex: /{([^}]+)}/g, type: "variable" as MentionType },
			{ regex: /<id:([^>]+)>/g, type: "role" as MentionType }, // Custom format
		];

		const processNextMatch = () => {
			let earliestMatch: {
				index: number;
				length: number;
				value: string;
				type: MentionType;
			} | null = null;

			// Find the earliest match across all patterns
			for (const pattern of patterns) {
				pattern.regex.lastIndex = 0; // Reset regex state
				const match = pattern.regex.exec(remainingText);
				if (
					match &&
					(earliestMatch === null || match.index < earliestMatch.index)
				) {
					earliestMatch = {
						index: match.index,
						length: match[0].length,
						value: match[0],
						type: pattern.type,
					};
				}
			}

			if (earliestMatch) {
				// Add text before the match
				if (earliestMatch.index > 0) {
					result.push({
						text: remainingText.substring(0, earliestMatch.index),
					});
				}

				// Add the mention
				result.push({
					type: "mention",
					mentionType: earliestMatch.type,
					value: earliestMatch.value,
					displayValue: earliestMatch.value,
					children: [{ text: "" }],
				});

				// Continue with the rest of the text
				remainingText = remainingText.substring(
					earliestMatch.index + earliestMatch.length,
				);
				processNextMatch();
			} else {
				// No more matches, add the remaining text
				if (remainingText) {
					result.push({ text: remainingText });
				}
			}
		};

		processNextMatch();
		return result;
	}

	function processNode(node: Node) {
		if (node.nodeType === Node.TEXT_NODE) {
			// Text node - process it for mentions
			const textContent = node.textContent || "";
			currentParagraph.children.push(...processText(textContent));
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			const element = node as HTMLElement;

			// Handle mention spans
			if (
				element.tagName === "SPAN" &&
				element.getAttribute("data-type") === "mention"
			) {
				const value = element.getAttribute("data-value") || "";
				const mentionType =
					element.getAttribute("data-mention-type") || guessMentionType(value);

				currentParagraph.children.push({
					type: "mention",
					mentionType: mentionType as MentionType,
					value,
					displayValue: element.textContent || value,
					children: [{ text: "" }],
				});
			}
			// Handle paragraph breaks
			else if (element.tagName === "P" || element.tagName === "DIV") {
				// If we already have content in the current paragraph, add it to results
				if (currentParagraph.children.length > 0) {
					result.push(currentParagraph);
					currentParagraph = { type: "paragraph", children: [] };
				}

				// Process all child nodes
				Array.from(element.childNodes).forEach(processNode);

				// If this is a paragraph element and not the last one, add a new paragraph
				if (element.tagName === "P" && element.nextElementSibling) {
					if (currentParagraph.children.length > 0) {
						result.push(currentParagraph);
						currentParagraph = { type: "paragraph", children: [] };
					}
				}
			}
			// Handle line breaks
			else if (element.tagName === "BR") {
				if (currentParagraph.children.length > 0) {
					result.push(currentParagraph);
					currentParagraph = { type: "paragraph", children: [] };
				}
			}
			// Handle other elements (just process their children)
			else {
				Array.from(element.childNodes).forEach(processNode);
			}
		}
	}
}

/** Quick guess: if it starts with "<@", it's role; if "<#", channel; if "{" variable, else variable. */
function guessMentionType(value: string): MentionType {
	if (value.startsWith("<@")) return "role";
	if (value.startsWith("<#")) return "channel";
	if (value.startsWith("<id:")) {
		const id = value.slice(4, -1);
		return id.toLowerCase().includes("channel") ? "channel" : "role";
	}
	if (value.startsWith("{")) return "variable";
	return "variable";
}

/**
 * Transform markdown and mention syntax into display text
 */
interface TransformOptions {
	roles?: Array<{ id: string; name: string }>;
	channels?: Array<Channel>;
	botId?: string;
	botName?: string;
}

function transformText(text: string, options: TransformOptions = {}): string {
	// Chain all transformations instead of reassigning
	return (
		text
			// Replace role mentions <@&123> with role names
			.replace(/<@&(\d+)>/g, (match, id) => {
				const role = options.roles?.find((r) => r.id === id);
				return role ? `@${role.name}` : match;
			})
			// Replace bot mention <@123> with bot name
			.replace(/<@(\d+)>/g, (match, id) => {
				return id === options.botId ? `@${options.botName || "Bot"}` : match;
			})
			// Replace channel mentions <#123> with channel names
			.replace(/<#(\d+)>/g, (match, id) => {
				const channel = options.channels?.find((c) => c.id === id);
				return channel ? `#${channel.name}` : match;
			})
			// Replace <id:customize> with "Roles & Channels"
			.replace(/<id:customize>/g, "Roles & Channels")
			// Replace markdown bold (handle both ** and __)
			.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>")
			// Replace markdown italic (handle both * and _)
			.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>")
			// Replace markdown code blocks with language
			.replace(
				/```(\w+)?\n([\s\S]*?)```/g,
				(_, lang, code) =>
					`<pre><code${lang ? ` class="language-${lang}"` : ""}>${code.trim()}</code></pre>`,
			)
			// Replace markdown inline code
			.replace(/`([^`]+)`/g, "<code>$1</code>")
			// Replace markdown strikethrough
			.replace(/~~(.*?)~~/g, "<del>$1</del>")
			// Replace markdown underline
			.replace(/__(.*?)__/g, "<u>$1</u>")
			// Replace markdown quotes
			.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
			// Replace markdown lists
			.replace(/^\* (.+)$/gm, "<li>$1</li>")
			.replace(/^- (.+)$/gm, "<li>$1</li>")
			.replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
			// Replace markdown headers
			.replace(/^#{1,6} (.+)$/gm, (match, content) => {
				const level = match.indexOf(" ");
				return `<h${level}>${content}</h${level}>`;
			})
			// Replace URLs
			.replace(/(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g, '<a href="$1">$1</a>')
	);
}

// Clean HTML function to be used throughout the component
function sanitizeHtml(html: string): string {
	if (!html) return "";

	// Only do minimal processing to fix known issues
	return (
		html
			// Fix doubly-escaped entities
			.replace(/&amp;lt;/g, "&lt;")
			.replace(/&amp;gt;/g, "&gt;")
			.replace(/&amp;quot;/g, "&quot;")
			.replace(/&amp;amp;/g, "&amp;")
	);
}
