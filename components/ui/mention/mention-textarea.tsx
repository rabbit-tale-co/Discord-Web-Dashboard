"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
	type Descendant,
	type BaseEditor,
	type Operation,
	type Range,
	type NodeEntry,
	BaseOperation,
	type Node as SlateNodeType,
	Path,
	Element as SlateElement,
	Editor,
	Transforms,
	Text,
	createEditor,
	Node as SlateNode,
} from "slate";
import { Slate, Editable, withReact, ReactEditor } from "slate-react";
import { withHistory } from "slate-history";
import { useParams } from "next/navigation";
import DOMPurify from "dompurify";

import { cn } from "@/lib/utils";
import { getCachedData } from "@/lib/cache";
import type { GuildData } from "@/types/guild";
import { getUser } from "@/hooks/use-user";
import { globalVariables, type Variable } from "@/lib/variables";
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

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
}

// A minimal "cache" for deserialization results to avoid repeated parsing:
const deserializationCache = new Map<string, ParagraphElement[]>();

// A single empty paragraph to initialize the editor
const EMPTY_VALUE: ParagraphElement[] = [
	{ type: "paragraph", children: [{ text: "" }] },
];

// Define types for editor elements
type BaseElement = {
	type: string;
	children: Descendant[];
};

type MentionElementType = BaseElement & {
	type: "mention" | "mention-placeholder";
	mentionType: MentionType;
	value?: string;
	displayValue?: string;
};

// Define custom types for our editor
type CustomElement = BaseElement & {
	type: string;
	children: CustomText[];
};

// Remove module augmentation since we'll use type assertions
// ... existing code ...

// Extended ReactEditor interface
interface ExtendedReactEditor extends ReactEditor {
	toSlateNode: (domNode: Node) => SlateNodeType;
	findPath: (domNode: Node) => Path;
	focus: () => void;
	blur: () => void;
	deselect: () => void;
	hasDOMNode: (node: Node, options?: { editable?: boolean }) => boolean;
	insertData: (data: DataTransfer) => void;
	setFragmentData: (data: DataTransfer) => void;
}

// Update ExtendedEditor to use ExtendedReactEditor
interface ExtendedEditor extends BaseEditor, ExtendedReactEditor {
	__initialized?: boolean;
	__lastReset?: number;
	isVoid: (element: BaseElement) => boolean;
	isInline: (element: BaseElement) => boolean;
	normalizeNode: (entry: NodeEntry<SlateNodeType>) => void;
	children: Descendant[];
	selection: Range | null;
	operations: Operation[];
	marks: Record<string, unknown> | null;
	onChange: () => void;
}

// Add this near the top of the file outside of components to create a proper editor instance cache
// This prevents creating multiple instances of the same editor
const editorInstanceCache: Record<string, ExtendedEditor> = {};

/** Create or reuse the Slate editor instance for this id. */
const createSlateEditor = (id: string): ExtendedEditor => {
	// Check if we already have an editor instance for this id
	if (editorInstanceCache[id]) {
		return editorInstanceCache[id];
	}

	// Otherwise create a new one
	const newEditor = withHistory(
		withReact(createEditor()),
	) as unknown as ExtendedEditor;

	// Extend `isVoid` and `isInline` for mention elements
	const { isVoid, isInline, normalizeNode, apply } = newEditor;

	// Override apply to handle range mapping errors
	newEditor.apply = (operation: Operation) => {
		try {
			apply(operation);
		} catch (err) {
			console.error("Error applying operation:", err);
			// If it's a selection operation that failed, try to recover
			if (operation.type === "set_selection" && operation.properties?.anchor) {
				try {
					// Try to set selection at the end
					const end = Editor.end(newEditor, []);
					Transforms.select(newEditor, end);
				} catch (recoveryErr) {
					console.error("Failed to recover from selection error:", recoveryErr);
				}
			}
		}
	};

	newEditor.isVoid = (element: BaseElement) => {
		return element.type === "mention" || element.type === "mention-placeholder"
			? true
			: isVoid(element);
	};

	newEditor.isInline = (element: BaseElement) => {
		return element.type === "mention" || element.type === "mention-placeholder"
			? true
			: isInline(element);
	};

	// Add normalizations to ensure cursor behavior is correct with mentions
	newEditor.normalizeNode = (entry: NodeEntry<SlateNodeType>) => {
		try {
			const [node, path] = entry;

			// When we have a selection, make sure it's not inside a void node (mention)
			if (
				newEditor.selection &&
				SlateElement.isElement(node) &&
				newEditor.isVoid(node)
			) {
				// Get current selection
				const { selection } = newEditor;

				// If selection is inside this void node, move it after
				if (
					Path.isDescendant(selection.anchor.path, path) ||
					Path.isDescendant(selection.focus.path, path)
				) {
					// Try to find a point after this node
					const after = Editor.after(newEditor, path);
					if (after) {
						Transforms.select(newEditor, after);
					}
					return; // We handled this case
				}
			}

			// When we have a mention element, ensure there's always a text node after it
			if (
				SlateElement.isElement(node) &&
				(node.type === "mention" || node.type === "mention-placeholder") &&
				path.length > 0
			) {
				// Get the parent path and index
				const parentPath = Path.parent(path);
				const index = path[path.length - 1];

				// Get the parent node
				const parentNode = SlateNode.get(newEditor, parentPath) as SlateElement;

				// Check if there's a text node after the mention
				const hasTextNodeAfter =
					parentNode.children.length > index + 1 &&
					Text.isText(parentNode.children[index + 1]);

				// If there's no text node after the mention, add one
				if (!hasTextNodeAfter) {
					Transforms.insertNodes(
						newEditor,
						{ text: "" },
						{ at: [...parentPath, index + 1] },
					);
					return; // We handled this case
				}
			}

			// Otherwise, apply the standard normalization
			normalizeNode(entry);
		} catch (err) {
			console.error("Error in normalizeNode:", err);
		}
	};

	// Store in our cache
	editorInstanceCache[id] = newEditor;
	return newEditor;
};

// Add this function before the MentionTextarea component
interface PlaceholderProps {
	children: React.ReactNode;
	attributes: React.HTMLAttributes<HTMLSpanElement>;
}

function CustomPlaceholder({ children, attributes }: PlaceholderProps) {
	return (
		<span
			{...attributes}
			className="text-muted-foreground absolute inset-0 px-3 py-2 pointer-events-none select-none opacity-60 overflow-hidden whitespace-nowrap text-ellipsis"
			style={{
				userSelect: "none",
				pointerEvents: "none",
				display: "inline-block",
			}}
		>
			{children}
		</span>
	);
}

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

	// Store the last value to prevent loss during tab switching
	const lastValueRef = useRef(value);

	// Track the initial mount to avoid unnecessary resets
	const initialMountRef = useRef(true);

	// Store onMentionEnd in a ref to avoid dependency issues
	const onMentionEndRef = useRef(onMentionEnd);

	// Update the ref when onMentionEnd changes
	useEffect(() => {
		onMentionEndRef.current = onMentionEnd;
	}, [onMentionEnd]);

	useEffect(() => {
		// Set mounted flag
		isMounted.current = true;
		initialMountRef.current = true;

		// Cleanup function
		return () => {
			isMounted.current = false;
		};
	}, []);

	/** Create or reuse the Slate editor instance for this id. */
	const editor = useMemo(() => createSlateEditor(id), [id]);

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

		// Process content for <id:customize> tags that might not be properly formatted
		let processedContent = contentToProcess;

		// Handle raw <id:customize> tags that might be in the text
		if (processedContent.includes("<id:customize>")) {
			processedContent = processedContent.replace(
				/<id:customize>/g,
				'<span data-type="mention" data-value="<id:customize>" data-mention-type="channel" contenteditable="false">Roles & Channels</span>',
			);
		}

		// Parse the HTML directly
		const result = deserializeHtml(processedContent, singleLine);
		deserializationCache.set(cacheKey, result);
		return result;
	}, [value, id, singleLine]);

	/** Load guild data from cache */
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
			console.error("Failed to load guild data from cache:", err);
		}
	}, [guildId]);
	// 	if (typeof window !== "undefined") {
	// 		const typedWindow = window as WindowWithEditors;
	// 		if (!typedWindow.__slateEditorInstances) {
	// 			typedWindow.__slateEditorInstances = {};
	// 		}
	// 		// Używamy id jako klucza, aby każdy edytor miał własny kontekst
	// 		typedWindow.__slateEditorInstances[id] = editor;

	// 		// Cleanup function to remove the editor instance when component unmounts
	// 		return () => {
	// 			if (typedWindow.__slateEditorInstances?.[id]) {
	// 				delete typedWindow.__slateEditorInstances[id];
	// 			}
	// 		};
	// 	}
	// }, [editor, id]);

	/** Simplify the editor change handler */
	const handleEditorChange = useCallback(
		(newValue: Descendant[]) => {
			try {
				// Ensure we have a valid editor instance
				if (!editor) {
					console.warn("No editor instance available");
					return;
				}

				// Update the editor's children
				editor.children = newValue;

				// Try to serialize the content
				try {
					const serialized = serializeToHtml(
						newValue,
						{
							roles,
							channels,
							botId: botData?.id,
							botName: botData?.username,
						},
						singleLine,
					);

					// Update the lastValueRef
					lastValueRef.current = serialized;

					// Call the onValueChange prop if provided
					if (onChange) {
						onChange(serialized);
					}
				} catch (serializeErr) {
					console.error("Error serializing content:", serializeErr);
					// Try to recover by using the last known good value
					if (lastValueRef.current) {
						const recovered = deserializeHtml(lastValueRef.current, singleLine);
						editor.children = recovered as Descendant[];
					}
				}
			} catch (err) {
				console.error("Error in onChange handler:", err);
			}
		},
		[editor, roles, channels, botData, singleLine, onChange],
	);

	// Add state for mention popover
	const [mentionPopover, setMentionPopover] = useState<{
		type: MentionType;
		search: string;
		anchor: { x: number; y: number } | null;
	} | null>(null);

	// Helper function to remove all mention placeholders with improved error handling
	const removeAllPlaceholders = useCallback(() => {
		try {
			// Use a more direct approach to find all placeholders
			const placeholders = Array.from(
				Editor.nodes(editor, {
					at: [], // Search the entire document
					match: (n) =>
						SlateElement.isElement(n) && n.type === "mention-placeholder",
					mode: "all",
				}),
			);

			// If we found any placeholders, remove them from last to first
			if (placeholders.length > 0) {
				console.log(`Found ${placeholders.length} placeholders to remove`);

				// Remove all placeholders from last to first to avoid path issues
				for (let i = placeholders.length - 1; i >= 0; i--) {
					const [_, path] = placeholders[i];
					console.log(`Removing placeholder at path: ${path.join(",")}`);
					Transforms.removeNodes(editor, { at: path });
				}

				// Force a normalization of the editor
				Editor.normalize(editor, { force: true });

				// Ensure focus is maintained
				ReactEditor.focus(editor);
			} else {
				console.log("No placeholders found to remove");
			}
		} catch (err) {
			console.error("Error removing placeholders:", err);
		}
	}, [editor]);

	// Create a function to safely close the popover and clean up
	const closePopover = useCallback(() => {
		if (mentionPopover) {
			console.log("Closing popover and cleaning up");
			// First remove placeholders
			removeAllPlaceholders();
			// Then close the popover
			setMentionPopover(null);
			// Then call the callback
			onMentionEnd?.();
		}
	}, [mentionPopover, removeAllPlaceholders, onMentionEnd]);

	// Helper function to calculate accurate anchor position
	const getAnchorPosition = useCallback(() => {
		const selection = window.getSelection();
		if (!selection || !selection.rangeCount) return null;

		const range = selection.getRangeAt(0);
		const rect = range.getBoundingClientRect();

		return {
			x: rect.left,
			y: rect.bottom,
		};
	}, []);

	// Add a mouse down handler to handle clicks on mention elements
	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			const target = e.target as HTMLElement;

			// Find if the click was on or inside a mention element
			const mentionElement = target.hasAttribute("data-mention-type")
				? target
				: target.closest("[data-mention-type]") ||
					(target.parentElement?.hasAttribute("data-mention-type")
						? target.parentElement
						: null);

			if (mentionElement) {
				e.preventDefault(); // Prevent default browser handling

				try {
					// Convert DOM element to Slate node
					const mentionNode = editor.toSlateNode(
						mentionElement as unknown as Node,
					);

					// Find path to the mention node
					const path = editor.findPath(mentionElement as unknown as Node);

					// Get parent node (usually paragraph) and mention's index
					const parentPath = Path.parent(path);
					const nodeIndex = path[path.length - 1];

					// Always ensure there's a text node after the mention
					Transforms.insertNodes(
						editor,
						{ text: "" },
						{ at: [...parentPath, nodeIndex + 1], select: true },
					);

					// Focus the editor
					editor.focus();
				} catch (err) {
					console.error("Error handling mention click:", err);
				}
			}
		},
		[editor],
	);

	// Update handleKeyDown to use ReactEditor.focus
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
				closePopover();
				return;
			}

			// Basic mention triggers (@, #, {)
			if (["@", "#", "{"].includes(e.key)) {
				e.preventDefault();
				const domSel = window.getSelection();
				if (domSel && domSel.rangeCount > 0) {
					const range = domSel.getRangeAt(0);

					// Calculate accurate anchor position
					const anchor = getAnchorPosition();
					if (!anchor) return;

					let mentionType: MentionType = "variable";
					if (e.key === "@") mentionType = "role";
					if (e.key === "#") mentionType = "channel";

					// Get the current selection
					const { selection } = editor;
					if (!selection) {
						ReactEditor.focus(editor);
						return;
					}

					// Insert a new placeholder with the trigger character
					Transforms.insertNodes(editor, {
						type: "mention-placeholder",
						mentionType,
						children: [{ text: "" }],
					});

					// Update local state with anchor position
					setMentionPopover({
						type: mentionType,
						search: "",
						anchor,
					});

					// Also call external handler if provided
					onMentionStart?.({
						type: mentionType,
						search: "",
						domRect: range.getBoundingClientRect(),
					});
				}
			}
		},
		[
			singleLine,
			onMentionStart,
			editor,
			mentionPopover,
			getAnchorPosition,
			closePopover,
		],
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
		"relative w-full border border-input rounded-md bg-background text-sm",
		singleLine ? "h-10 overflow-y-hidden overflow-x-auto" : "overflow-y-auto",
		"px-3 py-2",
		// focused ? "ring-1 ring-ring" : "",
		"focus:outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
		className,
	);

	return (
		<div ref={editorRef} className="relative w-full focus-within:outline-none">
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
					onMouseDown={handleMouseDown}
					renderPlaceholder={({ children, attributes }) => (
						<CustomPlaceholder attributes={attributes}>
							{children}
						</CustomPlaceholder>
					)}
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
									const [_, path] = placeholderEntry;
									Transforms.removeNodes(editor, { at: path });
									ReactEditor.focus(editor);
								}
							} catch (err) {
								console.error("Error removing placeholder:", err);
							}
							closePopover();
						}
					}}
				>
					<PopoverTrigger asChild>
						<div
							className="size-0 absolute"
							style={{
								left: mentionPopover.anchor ? mentionPopover.anchor.x : 0,
								top: mentionPopover.anchor ? mentionPopover.anchor.y : 0,
								position: "fixed",
								zIndex: 9999,
							}}
						>
							<span className="sr-only">Toggle mention popover</span>
						</div>
					</PopoverTrigger>
					<PopoverContent
						className="p-0"
						align="start"
						alignOffset={-5}
						sideOffset={5}
					>
						<Command>
							<CommandInput
								placeholder={`Search ${mentionPopover.type}s...`}
								onKeyDown={(e) => {
									if (e.key === "Escape") {
										e.preventDefault();
										e.stopPropagation();
										try {
											const [placeholderEntry] = Editor.nodes(editor, {
												match: (n) =>
													SlateElement.isElement(n) &&
													n.type === "mention-placeholder",
											});

											if (placeholderEntry) {
												const [_, path] = placeholderEntry;
												Transforms.removeNodes(editor, { at: path });
												ReactEditor.focus(editor);
											}
										} catch (err) {
											console.error("Error removing placeholder:", err);
										}
										closePopover();
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
															const [_, path] = placeholderEntry;

															// Replace the placeholder with mention in a single operation
															Transforms.setNodes<MentionElement>(
																editor,
																{
																	type: "mention",
																	mentionType: "role",
																	value: role.id,
																	displayValue: `@${role.name}`,
																	children: [{ text: "" }],
																} as MentionElement,
																{ at: path },
															);

															// Move cursor after the mention
															const after = Editor.after(editor, path);
															if (after) {
																Transforms.select(editor, after);
															}
															ReactEditor.focus(editor);
														} else {
															// If no placeholder found, try to insert at current selection
															console.warn(
																"No placeholder found, inserting at selection",
															);
															Transforms.insertNodes(editor, {
																type: "mention",
																mentionType: "role",
																value: role.id,
																displayValue: `@${role.name}`,
																children: [{ text: "" }],
															} as MentionElement);
															ReactEditor.focus(editor);
														}
													} catch (err) {
														console.error(
															"Error handling mention selection:",
															err,
														);
														// Try to clean up any placeholders
														try {
															const [placeholderEntry] = Editor.nodes(editor, {
																match: (n) =>
																	SlateElement.isElement(n) &&
																	n.type === "mention-placeholder",
															});
															if (placeholderEntry) {
																const [_, path] = placeholderEntry;
																Transforms.removeNodes(editor, { at: path });
															}
														} catch (cleanupErr) {
															console.error("Error cleaning up:", cleanupErr);
														}
													} finally {
														closePopover();
													}
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
															const [_, path] = placeholderEntry;

															// Replace the placeholder with mention in a single operation
															Transforms.setNodes<MentionElement>(
																editor,
																{
																	type: "mention",
																	mentionType: "channel",
																	value: channel.id,
																	displayValue: `#${channel.name}`,
																	children: [{ text: "" }],
																} as MentionElement,
																{ at: path },
															);

															// Move cursor after the mention
															const after = Editor.after(editor, path);
															if (after) {
																Transforms.select(editor, after);
															}
															ReactEditor.focus(editor);
														} else {
															// If no placeholder found, try to insert at current selection
															console.warn(
																"No placeholder found, inserting at selection",
															);
															Transforms.insertNodes(editor, {
																type: "mention",
																mentionType: "channel",
																value: channel.id,
																displayValue: `#${channel.name}`,
																children: [{ text: "" }],
															} as MentionElement);
															ReactEditor.focus(editor);
														}
													} catch (err) {
														console.error(
															"Error handling mention selection:",
															err,
														);
														// Try to clean up any placeholders
														try {
															const [placeholderEntry] = Editor.nodes(editor, {
																match: (n) =>
																	SlateElement.isElement(n) &&
																	n.type === "mention-placeholder",
															});
															if (placeholderEntry) {
																const [_, path] = placeholderEntry;
																Transforms.removeNodes(editor, { at: path });
															}
														} catch (cleanupErr) {
															console.error("Error cleaning up:", cleanupErr);
														}
													} finally {
														closePopover();
													}
												}}
											>
												#{channel.name}
											</CommandItem>
										))}
										<CommandItem
											key="roles-and-channels"
											onSelect={() => {
												try {
													const [placeholderEntry] = Editor.nodes(editor, {
														match: (n) =>
															SlateElement.isElement(n) &&
															n.type === "mention-placeholder",
													});

													if (placeholderEntry) {
														const [_, path] = placeholderEntry;

														// Replace the placeholder with mention in a single operation
														Transforms.setNodes<MentionElement>(
															editor,
															{
																type: "mention",
																mentionType: "channel",
																value: "customize",
																displayValue: "Roles & Channels",
																children: [{ text: "" }],
															} as MentionElement,
															{ at: path },
														);

														// Move cursor after the mention
														const after = Editor.after(editor, path);
														if (after) {
															Transforms.select(editor, after);
														}
														ReactEditor.focus(editor);
													} else {
														// If no placeholder found, try to insert at current selection
														console.warn(
															"No placeholder found, inserting at selection",
														);
														Transforms.insertNodes(editor, {
															type: "mention",
															mentionType: "channel",
															value: "customize",
															displayValue: "Roles & Channels",
															children: [{ text: "" }],
														} as MentionElement);
														ReactEditor.focus(editor);
													}
												} catch (err) {
													console.error(
														"Error handling mention selection:",
														err,
													);
													// Try to clean up any placeholders
													try {
														const [placeholderEntry] = Editor.nodes(editor, {
															match: (n) =>
																SlateElement.isElement(n) &&
																n.type === "mention-placeholder",
														});
														if (placeholderEntry) {
															const [_, path] = placeholderEntry;
															Transforms.removeNodes(editor, { at: path });
														}
													} catch (cleanupErr) {
														console.error("Error cleaning up:", cleanupErr);
													}
												} finally {
													closePopover();
												}
											}}
										>
											Roles & Channels
										</CommandItem>
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
													onSelect={() => closePopover()}
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
		let mentionStyle = "";

		// Define styles for different mention types
		switch (mention.mentionType) {
			case "role":
				mentionStyle = "bg-blue-100 text-blue-800 border-blue-300";
				break;
			case "channel":
				mentionStyle = "bg-green-100 text-green-800 border-green-300";
				break;
			case "variable":
				mentionStyle = "bg-amber-100 text-amber-800 border-amber-300";
				break;
			default:
				mentionStyle = "bg-purple-100 text-purple-800 border-purple-300";
		}

		if (mention.mentionType === "role") {
			// Handle role mentions
			const roleId = mention.value;
			const role = roles.find((r) => r.id === roleId);
			if (role) {
				displayText = `@${role.name}`;
			} else if (mention.value === "customize") {
				mentionStyle = "bg-green-100 text-green-800 border-green-300";
				displayText = "Roles & Channels";
			}
		} else if (mention.mentionType === "channel") {
			// Handle channel mentions
			const channelId = mention.value;
			if (channelId === "customize") {
				displayText = "Roles & Channels";
			} else {
				const channel = channels.find((c) => c.id === channelId);
				if (channel) {
					displayText = `#${channel.name}`;
				} else {
					// If channel not found, display the raw ID
					displayText = `#${channelId}`;
				}
			}
		} else if (mention.mentionType === "variable") {
			// Variables are stored as is
			displayText = mention.value;
			// Remove curly braces if present
			if (displayText.startsWith("{") && displayText.endsWith("}")) {
				displayText = displayText.slice(1, -1);
			}
		}

		return (
			<span
				{...attributes}
				contentEditable={false}
				className={cn(
					"rounded-md px-1.5 py-0.5 text-sm select-all border cursor-default font-medium",
					mentionStyle,
				)}
				data-mention-type={mention.mentionType}
				data-value={mention.value}
				data-slate-void="true"
				aria-atomic="true"
				role="button"
				style={{
					userSelect: "all",
					WebkitUserSelect: "all",
					pointerEvents: "none",
				}}
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

		let placeholderStyle = "";
		switch (placeholder.mentionType) {
			case "role":
				placeholderStyle = "bg-blue-100 text-blue-800 border-blue-300";
				break;
			case "channel":
				placeholderStyle = "bg-green-100 text-green-800 border-green-300";
				break;
			case "variable":
				placeholderStyle = "bg-amber-100 text-amber-800 border-amber-300";
				break;
			default:
				placeholderStyle = "bg-purple-100 text-purple-800 border-purple-300";
		}

		return (
			<span
				{...attributes}
				contentEditable={false}
				className={cn(
					"rounded-md px-1.5 py-0.5 text-sm select-all border cursor-default font-medium",
					placeholderStyle,
				)}
				data-mention-placeholder
				data-mention-type={placeholder.mentionType}
				data-slate-void="true"
				aria-atomic="true"
				role="button"
				style={{
					userSelect: "all",
					WebkitUserSelect: "all",
					pointerEvents: "none",
				}}
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
interface TransformOptions {
	roles?: Array<{ id: string; name: string }>;
	channels?: Array<Channel>;
	botId?: string;
	botName?: string;
}

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
				// Sanitize text content
				return DOMPurify.sanitize(node.text);
			}
			if (SlateElement.isElement(node)) {
				switch (node.type) {
					case "mention": {
						const mention = node as MentionElement;
						const safeValue = (mention.value || "").trim();

						// IMPORTANT: Sanitize the mention value to prevent HTML corruption
						const sanitizedValue = DOMPurify.sanitize(safeValue);
						let displayValue = sanitizedValue;
						let finalValue = sanitizedValue;

						// Transform mentions using the same logic as display
						if (mention.mentionType === "channel") {
							if (sanitizedValue === "customize") {
								displayValue = "Roles & Channels";
								finalValue = "customize";
							} else {
								const channel = transformOptions.channels?.find(
									(c) => c.id === sanitizedValue,
								);
								if (channel) {
									displayValue = `#${channel.name}`;
									finalValue = sanitizedValue; // just the ID
								}
							}
						} else if (mention.mentionType === "role") {
							const role = transformOptions.roles?.find(
								(r) => r.id === sanitizedValue,
							);
							if (role) {
								displayValue = `@${role.name}`;
								finalValue = sanitizedValue; // just the ID
							}
						} else if (mention.mentionType === "variable") {
							displayValue = sanitizedValue;
							finalValue = sanitizedValue;
						}

						// Sanitize the display value
						const sanitizedDisplay = DOMPurify.sanitize(displayValue);

						return `<span data-type="mention" data-mention-type="${mention.mentionType}" data-value="${finalValue}" contenteditable="false">${sanitizedDisplay}</span>`;
					}
					case "paragraph":
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
						const safeValue = DOMPurify.sanitize(
							(m.children[0]?.text || "").trim(),
						);
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
		result = result.replace(/<\/?p>/g, "");
	}

	// Final sanitization of the entire HTML string
	const purifyConfig = {
		ALLOWED_TAGS: ["span", "p", "div", "br"],
		ALLOWED_ATTR: [
			"data-type",
			"data-value",
			"data-mention-type",
			"contenteditable",
		],
	};
	return DOMPurify.sanitize(result, purifyConfig);
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

	// Clean up any raw span tags that might be visible in the text
	processedHtml = processedHtml.replace(/<span[^>]*>/g, "");
	processedHtml = processedHtml.replace(/<\/span>/g, "");

	// Configure DOMPurify
	const purifyConfig = {
		ALLOWED_TAGS: [
			"span",
			"p",
			"div",
			"br",
			"strong",
			"em",
			"u",
			"del",
			"code",
		],
		ALLOWED_ATTR: [
			"data-type",
			"data-value",
			"data-mention-type",
			"contenteditable",
			"class",
		],
		ADD_ATTR: ["data-type", "data-value", "data-mention-type"],
		KEEP_CONTENT: true,
		RETURN_DOM: false,
		RETURN_DOM_FRAGMENT: false,
		RETURN_DOM_IMPORT: false,
		WHOLE_DOCUMENT: false,
		SANITIZE_DOM: true,
	};

	// First pass: Handle raw channel mentions <#id>
	processedHtml = processedHtml.replace(/<#(\d+)>/g, (match, id) =>
		DOMPurify.sanitize(
			`<span data-type="mention" data-value="${id}" data-mention-type="channel" contenteditable="false"><#${id}></span>`,
			purifyConfig,
		),
	);

	// Second pass: Handle raw role mentions <@&id>
	processedHtml = processedHtml.replace(/<@&(\d+)>/g, (match, id) =>
		DOMPurify.sanitize(
			`<span data-type="mention" data-value="${id}" data-mention-type="role" contenteditable="false">@role-${id}</span>`,
			purifyConfig,
		),
	);

	// Third pass: Handle raw user mentions <@id>
	processedHtml = processedHtml.replace(/<@!?(\d+)>/g, (match, id) =>
		DOMPurify.sanitize(
			`<span data-type="mention" data-value="${id}" data-mention-type="user" contenteditable="false">@user-${id}</span>`,
			purifyConfig,
		),
	);

	// Fourth pass: Handle raw <id:customize> tags and malformed mentions
	processedHtml = processedHtml.replace(
		/<id:customize>|" data-mention-type="channel" contenteditable="false">Roles & Channels/g,
		DOMPurify.sanitize(
			'<span data-type="mention" data-value="customize" data-mention-type="channel" contenteditable="false">Roles & Channels</span>',
			purifyConfig,
		),
	);

	// Fifth pass: Handle variables in {variable_name} format
	processedHtml = processedHtml.replace(
		/\{([^}]+)\}/g,
		(match, variableName) => {
			// Usuwamy nawiasy klamrowe z nazwy zmiennej
			const cleanVariableName = variableName.trim();
			return DOMPurify.sanitize(
				`<span data-type="mention" data-value="${cleanVariableName}" data-mention-type="variable" contenteditable="false">${cleanVariableName}</span>`,
				purifyConfig,
			);
		},
	);

	// Handle markdown-style formatting
	const markdownReplacements = [
		// Bold
		[/\*\*(.*?)\*\*/g, "<strong>$1</strong>"],
		// Italic
		[/\*(.*?)\*/g, "<em>$1</em>"],
		// Underline
		[/___(.*?)___/g, "<u>$1</u>"],
		// Strikethrough
		[/~~(.*?)~~/g, "<del>$1</del>"],
		// Code
		[/`([^`]+)`/g, "<code>$1</code>"],
	];

	for (const [pattern, replacement] of markdownReplacements) {
		processedHtml = processedHtml.replace(
			pattern as RegExp,
			replacement as string,
		);
	}

	// Final sanitization pass
	processedHtml = DOMPurify.sanitize(processedHtml, purifyConfig);

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

	function processNode(node: Node) {
		if (node.nodeType === Node.TEXT_NODE) {
			const textContent = node.textContent || "";
			if (textContent.trim()) {
				currentParagraph.children.push({ text: textContent });
			}
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			const element = node as HTMLElement;

			if (
				element.tagName === "SPAN" &&
				element.getAttribute("data-type") === "mention"
			) {
				const value = DOMPurify.sanitize(
					element.getAttribute("data-value") || "",
				);
				const mentionType =
					(element.getAttribute("data-mention-type") as MentionType) ||
					"variable";
				const displayValue = DOMPurify.sanitize(element.textContent || value);

				// Special handling for <id:customize>
				if (value === "<id:customize>") {
					currentParagraph.children.push({
						type: "mention",
						mentionType: "channel",
						value: "<id:customize>",
						displayValue: "Roles & Channels",
						children: [{ text: "" }],
					});
				} else {
					currentParagraph.children.push({
						type: "mention",
						mentionType,
						value,
						displayValue,
						children: [{ text: "" }],
					});
				}
			} else if (element.tagName === "STRONG") {
				currentParagraph.children.push({
					text: element.textContent || "",
					bold: true,
				});
			} else if (element.tagName === "EM") {
				currentParagraph.children.push({
					text: element.textContent || "",
					italic: true,
				});
			} else if (element.tagName === "U") {
				currentParagraph.children.push({
					text: element.textContent || "",
					underline: true,
				});
			} else if (element.tagName === "DEL") {
				currentParagraph.children.push({
					text: element.textContent || "",
					strikethrough: true,
				});
			} else if (element.tagName === "CODE") {
				currentParagraph.children.push({
					text: element.textContent || "",
					code: true,
				});
			} else if (element.tagName === "P" || element.tagName === "DIV") {
				if (currentParagraph.children.length > 0) {
					result.push(currentParagraph);
					currentParagraph = { type: "paragraph", children: [] };
				}

				Array.from(element.childNodes).forEach(processNode);

				if (element.tagName === "P" && element.nextElementSibling) {
					if (currentParagraph.children.length > 0) {
						result.push(currentParagraph);
						currentParagraph = { type: "paragraph", children: [] };
					}
				}
			} else if (element.tagName === "BR") {
				if (!singleLine) {
					if (currentParagraph.children.length > 0) {
						result.push(currentParagraph);
						currentParagraph = { type: "paragraph", children: [] };
					}
				}
			} else {
				Array.from(element.childNodes).forEach(processNode);
			}
		}
	}
}
