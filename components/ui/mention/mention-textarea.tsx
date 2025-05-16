"use client";

import type React from "react";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { Descendant, Node, Path } from "slate";
import {
	createEditor,
	Editor,
	Transforms,
	Element as SlateElement,
	Range,
} from "slate";
import type { RenderElementProps, RenderLeafProps } from "slate-react";
import { Slate, Editable, withReact, ReactEditor } from "slate-react";
import { withHistory } from "slate-history";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { insertMentionAtPlaceholder } from "@/lib/mentionHelpers";
import { MENTION_TYPE_CONFIG } from "./element";
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
	CommandItem,
	CommandInput,
} from "@/components/ui/command";
import type {
	CustomEditor,
	MentionPlaceholderElement,
	StarWarsMentionElement,
	CustomText,
	MentionTextareaProps,
} from "@/types/editorTypes";
import Element from "./element";
import Leaf from "./leaf";
import { withMentions } from "./withMentions";
import { getCachedData } from "@/lib/cache";
import type { GuildData, RawChannel } from "@/types/guild";
import { useParams } from "next/navigation";

export const MentionTextarea: React.FC<MentionTextareaProps> = ({
	name,
	value = "",
	onChange,
	placeholder = "Type '@' to mention someone...",
	className,
	disabled = false,
	rows = 3,
	maxLength,
	id,
}) => {
	const guildId = id as string;

	// Always ensure we have at least one paragraph with text to prevent Slate errors
	const defaultValue: Descendant[] = [
		{ type: "paragraph", children: [{ text: "" }] },
	];

	const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
	const [channels, setChannels] = useState<RawChannel[]>([]);

	// Create a separate function for processing text with mentions that doesn't depend on channels/roles
	const processTextWithMentions = useCallback(
		(
			text: string,
			channelsData: RawChannel[] = [],
			rolesData: { id: string; name: string }[] = [],
		) => {
			const result: (Partial<CustomText> | StarWarsMentionElement)[] = [];

			// Process formatting marks and mentions
			let currentText = "";
			let index = 0;

			// Helper to add current text with its formatting
			const pushCurrentText = () => {
				if (currentText) {
					result.push({ text: currentText });
					currentText = "";
				}
			};

			// Process channel mentions <#123456789>
			const channelRegex = /<#(\d+)>/g;
			let channelMatch: RegExpExecArray | null;

			// Process role mentions <@&123456789>
			const roleRegex = /<@&(\d+)>/g;
			let roleMatch: RegExpExecArray | null;

			// Process variables like {server_name}
			const variableRegex = /{([a-z_]+)}/g;
			let variableMatch: RegExpExecArray | null;

			// Process bold text with **text**
			const boldRegex = /\*\*([^*]+)\*\*/g;
			let boldMatch: RegExpExecArray | null;

			// Process special channel format <id:channelname>
			const specialChannelRegex = /<id:([a-z_]+)>/g;
			let specialChannelMatch: RegExpExecArray | null;

			// Process all possible matches and sort by position
			while (index < text.length) {
				// Reset all regex indexes to the current position
				channelRegex.lastIndex = index;
				roleRegex.lastIndex = index;
				variableRegex.lastIndex = index;
				boldRegex.lastIndex = index;
				specialChannelRegex.lastIndex = index;

				// Find all possible matches
				channelMatch = channelRegex.exec(text);
				roleMatch = roleRegex.exec(text);
				variableMatch = variableRegex.exec(text);
				boldMatch = boldRegex.exec(text);
				specialChannelMatch = specialChannelRegex.exec(text);

				// Find the earliest match
				const matches = [
					{ type: "channel", match: channelMatch },
					{ type: "role", match: roleMatch },
					{ type: "variable", match: variableMatch },
					{ type: "bold", match: boldMatch },
					{ type: "specialChannel", match: specialChannelMatch },
				].filter((m) => m.match !== null);

				if (matches.length === 0) {
					// No more matches, add the rest of the text
					currentText += text.substring(index);
					pushCurrentText();
					break;
				}

				// Sort matches by index
				matches.sort((a, b) => (a.match?.index || 0) - (b.match?.index || 0));
				const firstMatch = matches[0];

				// Safety check - shouldn't happen since we've filtered null matches
				if (!firstMatch || !firstMatch.match) {
					// No valid match, add the rest of text
					currentText += text.substring(index);
					pushCurrentText();
					break;
				}

				const matchValue = firstMatch.match;

				// Add text before the match
				if (matchValue.index > index) {
					currentText += text.substring(index, matchValue.index);
					pushCurrentText();
				}

				// Handle the match based on its type
				if (firstMatch.type === "channel") {
					// Channel mention
					const channelId = matchValue[1];
					const channel = channelsData.find((c) => c.id === channelId);
					const displayName = channel ? channel.name : channelId;

					result.push({
						type: "mention",
						mentionType: "channel",
						value: channelId,
						displayValue: displayName,
						children: [{ text: "" }],
					});

					index = matchValue.index + matchValue[0].length;
				} else if (firstMatch.type === "specialChannel") {
					// Special channel format <id:channelname>
					const channelName = matchValue[1];

					// Special case for customize channel
					const displayName =
						channelName === "customize" ? "Channels & Roles" : channelName;

					result.push({
						type: "mention",
						mentionType: "channel",
						value: channelName, // No actual ID, using the name as identifier
						displayValue: displayName,
						children: [{ text: "" }],
					});

					index = matchValue.index + matchValue[0].length;
				} else if (firstMatch.type === "role") {
					// Role mention
					const roleId = matchValue[1];
					const role = rolesData.find((r) => r.id === roleId);
					const displayName = role ? role.name : roleId;

					result.push({
						type: "mention",
						mentionType: "role",
						value: roleId,
						displayValue: displayName,
						children: [{ text: "" }],
					});

					index = matchValue.index + matchValue[0].length;
				} else if (firstMatch.type === "variable") {
					// Variable mention
					const varName = matchValue[1];

					result.push({
						type: "mention",
						mentionType: "variable",
						value: varName,
						displayValue: varName,
						children: [{ text: "" }],
					});

					index = matchValue.index + matchValue[0].length;
				} else if (firstMatch.type === "bold") {
					// Bold text
					result.push({
						text: matchValue[1],
						bold: true,
					});

					index = matchValue.index + matchValue[0].length;
				}
			}

			return result.length > 0 ? result : [{ text }];
		},
		[],
	);

	// If there's a value, try to parse it or use as plain text
	const initialValue = useMemo<Descendant[]>(() => {
		if (!value || value.trim() === "") {
			return defaultValue;
		}

		try {
			// If it's a JSON string, parse it
			if (value.startsWith("[") && value.endsWith("]")) {
				const parsed = JSON.parse(value);
				// Verify it has valid nodes before using it
				if (Array.isArray(parsed) && parsed.length > 0) {
					return parsed;
				}
			}

			// Split by line breaks first to create paragraphs
			const paragraphs = value.split(/\n/);
			if (paragraphs.length > 0) {
				// Simple version without trying to resolve channel/role names on first load
				return paragraphs.map((paragraph) => {
					// Process each paragraph individually
					return {
						type: "paragraph",
						children: processTextWithMentions(paragraph, channels, roles),
					};
				});
			}

			// If parsing fails, create a simple paragraph
			return [
				{
					type: "paragraph",
					children: [{ text: value }],
				},
			];
		} catch (e) {
			console.error("Error parsing initial value:", e);
			// If parsing fails, use the value as plain text
			return [
				{
					type: "paragraph",
					children: [{ text: value }],
				},
			];
		}
	}, [value, processTextWithMentions, channels, roles]);

	const [internalValue, setInternalValue] =
		useState<Descendant[]>(defaultValue);
	const [editorError, setEditorError] = useState<boolean>(false);
	const [charCount, setCharCount] = useState(0);
	const [mentionPopover, setMentionPopover] = useState<{
		type: string;
		search: string;
		anchor: { x: number; y: number } | null;
	} | null>(null);

	// Define variables for mention autocompletion
	const variables = useMemo(
		() => [
			{ id: "user", name: "user" },
			{ id: "server", name: "server" },
			{ id: "server_name", name: "server_name" },
			{ id: "username", name: "username" },
			{ id: "member_count", name: "member_count" },
		],
		[],
	);

	useEffect(() => {
		try {
			const cacheKey = `guild-${guildId}`;
			const cached = getCachedData<GuildData>(cacheKey);
			if (cached?.data) {
				setRoles(cached.data.roles || []);
				const nonCategoryChannels = (cached.data.channels || []).filter(
					(channel) => typeof channel.type === "number" && channel.type !== 4,
				);
				setChannels(nonCategoryChannels);
			}
		} catch (err) {
			console.error(err);
		}
	}, [guildId]);

	// Initialize editor with plugin and handle errors
	const editor = useMemo(() => {
		try {
			return withMentions(
				withReact(withHistory(createEditor())) as CustomEditor,
			);
		} catch (e) {
			console.error("Error creating Slate editor:", e);
			setEditorError(true);
			return null;
		}
	}, []);

	// Initialize internal value when initialValue changes
	useEffect(() => {
		setInternalValue(initialValue);
	}, [initialValue]);

	// Reset error state when value changes
	useEffect(() => {
		if (editorError) {
			setEditorError(false);
		}
	}, [editorError]);

	// Update mentions when channels or roles change
	useEffect(() => {
		if (
			(channels.length > 0 || roles.length > 0) &&
			editor &&
			internalValue.length > 0
		) {
			try {
				// Check if we have any mentions that need to be updated
				let needsUpdate = false;

				// Helper function to check if a node has mentions that need updating
				const checkNodeForMentions = (node: Descendant): boolean => {
					if (!node) return false;

					// If it's a mention node, check if it needs update
					if (
						"type" in node &&
						node.type === "mention" &&
						"mentionType" in node &&
						"value" in node
					) {
						if (node.mentionType === "channel") {
							const channel = channels.find((c) => c.id === node.value);
							if (
								channel &&
								(!("displayValue" in node) || node.displayValue === node.value)
							) {
								return true;
							}
						} else if (node.mentionType === "role") {
							const role = roles.find((r) => r.id === node.value);
							if (
								role &&
								(!("displayValue" in node) || node.displayValue === node.value)
							) {
								return true;
							}
						}
					}

					// Check children recursively
					if ("children" in node) {
						for (const child of node.children) {
							if (checkNodeForMentions(child)) {
								return true;
							}
						}
					}

					return false;
				};

				// Check if any nodes need update
				for (const node of internalValue) {
					if (checkNodeForMentions(node)) {
						needsUpdate = true;
						break;
					}
				}

				if (needsUpdate) {
					// Create a new value with updated mention display names
					const updatedValue = JSON.parse(JSON.stringify(internalValue));

					// Helper function to update mentions in a node
					const updateMentionsInNode = (node: Descendant) => {
						if (!node) return;

						// Update mention node
						if (
							"type" in node &&
							node.type === "mention" &&
							"mentionType" in node &&
							"value" in node
						) {
							if (node.mentionType === "channel") {
								const channel = channels.find((c) => c.id === node.value);
								if (channel) {
									(node as StarWarsMentionElement).displayValue = channel.name;
								}
							} else if (node.mentionType === "role") {
								const role = roles.find((r) => r.id === node.value);
								if (role) {
									(node as StarWarsMentionElement).displayValue = role.name;
								}
							}
						}

						// Update children recursively
						if ("children" in node) {
							for (const child of node.children) {
								updateMentionsInNode(child);
							}
						}
					};

					// Update all nodes
					for (const node of updatedValue) {
						updateMentionsInNode(node);
					}

					// Update the editor with new value
					Editor.withoutNormalizing(editor, () => {
						editor.children = updatedValue;
						editor.onChange();
					});
				}
			} catch (e) {
				console.error("Error updating mentions:", e);
			}
		}
	}, [channels, roles, editor, internalValue]);

	const editorContainerRef = useRef<HTMLDivElement>(null);

	const renderElement = useCallback(
		(props: RenderElementProps) => <Element {...props} />,
		[],
	);
	const renderLeaf = useCallback(
		(props: RenderLeafProps) => <Leaf {...props} />,
		[],
	);

	const handleSlateChange = useCallback(
		(newValue: Descendant[]) => {
			try {
				setInternalValue(newValue);

				// Serialize the Slate value to plain text
				let serialized = "";

				// Simple serialization - convert nodes to text
				const serializeNode = (node: Descendant): string => {
					if (!node) return "";

					// Handle text nodes with formatting
					if ("text" in node) {
						// We're not using newline characters within paragraphs anymore
						let result = node.text;

						// Apply formatting
						if (node.bold) {
							result = `**${result}**`;
						}
						if (node.italic) {
							result = `*${result}*`;
						}
						if (node.strikethrough) {
							result = `~~${result}~~`;
						}
						if (node.underline) {
							result = `__${result}__`;
						}

						return result;
					}

					// Handle mention nodes
					if (
						"type" in node &&
						node.type === "mention" &&
						"displayValue" in node &&
						"value" in node &&
						"mentionType" in node
					) {
						// Format based on mention type
						if (node.mentionType === "channel") {
							// Check if this is a special channel without a numeric ID
							if (!/^\d+$/.test(node.value)) {
								return `<id:${node.value}>`;
							}
							return `<#${node.value}>`;
						}
						if (node.mentionType === "role") {
							return `<@&${node.value}>`;
						}
						if (node.mentionType === "variable") {
							return `{${node.value}}`;
						}
						return node.displayValue;
					}

					// Handle spoiler nodes
					if (
						"type" in node &&
						node.type === "spoiler" &&
						"children" in node &&
						Array.isArray(node.children)
					) {
						return `||${node.children.map(serializeNode).join("")}||`;
					}

					// Handle paragraph nodes
					if (
						"type" in node &&
						node.type === "paragraph" &&
						"children" in node &&
						Array.isArray(node.children)
					) {
						return node.children.map(serializeNode).join("");
					}

					// Default empty string
					return "";
				};

				// Join paragraphs with single newlines to preserve formatting
				serialized = newValue.map(serializeNode).join("\n");

				// Update character count
				setCharCount(serialized.length);

				if (onChange) {
					onChange(serialized);
				}
			} catch (e) {
				console.error("Error in Slate onChange:", e);
				setEditorError(true);
			}
		},
		[onChange],
	);

	// Handle mention item selection from dropdown
	const handleMentionSelect = useCallback(
		(value: string, type: string, displayValue: string) => {
			if (!editor) return;

			// Create the mention element
			const mention: StarWarsMentionElement = {
				type: "mention",
				mentionType: type as "role" | "channel" | "variable",
				value,
				displayValue,
				children: [{ text: "" }],
			};

			try {
				// First, find placeholder nodes - use Array.from to get all placeholders
				const placeholderEntries = Array.from(
					Editor.nodes(editor, {
						match: (n) =>
							SlateElement.isElement(n) && n.type === "mention-placeholder",
					}),
				);

				// If we found placeholders
				if (placeholderEntries.length > 0) {
					// Get the first placeholder
					const [_, path] = placeholderEntries[0];

					// Save the current selection to restore it later
					const savedSelection = editor.selection
						? { ...editor.selection }
						: null;

					// Perform operations with normalization disabled to prevent selection shifting
					Editor.withoutNormalizing(editor, () => {
						// Remove the placeholder
						Transforms.removeNodes(editor, {
							at: path,
							match: (n) =>
								SlateElement.isElement(n) && n.type === "mention-placeholder",
						});

						// Insert the mention exactly at the same position
						Transforms.insertNodes(editor, mention, { at: path });

						// Determine the position right after the mention
						// Need to use the exact same path for insertion as for removal
						const afterMentionPoint =
							Editor.after(editor, path) || Editor.end(editor, []);

						// Manually set selection point after the mention
						Transforms.select(editor, afterMentionPoint);

						// Optionally add a space after the mention if needed
						if (!afterMentionPoint.path) {
							Transforms.insertText(editor, " ");
						}
					});

					// Focus the editor
					ReactEditor.focus(editor);
				} else {
					// Fallback: insert at current selection if no placeholder
					const { selection } = editor;
					if (selection && Range.isCollapsed(selection)) {
						Transforms.insertNodes(editor, mention);
						Transforms.move(editor); // Move cursor after the mention
					}
				}

				// Close the popover
				setMentionPopover(null);
			} catch (e) {
				console.error("Error inserting mention:", e);

				// Fallback to simpler insertion if the above fails
				try {
					// Find the placeholder again
					const placeholders = Editor.nodes(editor, {
						match: (n) =>
							SlateElement.isElement(n) && n.type === "mention-placeholder",
					});

					const placeholderEntry = placeholders.next().value;

					if (placeholderEntry) {
						const [_, path] = placeholderEntry;

						// Simple replacement
						Transforms.removeNodes(editor, { at: path });
						Transforms.insertNodes(editor, mention, { at: path });
					} else {
						// Insert at current selection
						Transforms.insertNodes(editor, mention);
					}

					// Move forward and add space
					Transforms.move(editor);
					Transforms.insertText(editor, " ");

					ReactEditor.focus(editor);
				} catch (err) {
					console.error("Fallback insertion also failed:", err);
				}

				setMentionPopover(null);
			}
		},
		[editor],
	);

	// Add keyboard handlers for mentions and line breaks
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (!editor) return;

			try {
				// If mention popover is open, handle special keys
				if (mentionPopover) {
					// Handle Escape to close mention popover
					if (event.key === "Escape") {
						event.preventDefault();
						event.stopPropagation();

						// Get the mentionType
						const mentionType = mentionPopover.type;

						// Get the plain text character from configuration
						const plainChar =
							MENTION_TYPE_CONFIG[
								mentionType as "role" | "channel" | "variable"
							].icon || "";

						// Remove any mention placeholders and insert the plain character
						try {
							// Find placeholders
							const placeholderEntries = Array.from(
								Editor.nodes(editor, {
									match: (n) =>
										SlateElement.isElement(n) &&
										n.type === "mention-placeholder",
								}),
							);

							if (placeholderEntries.length > 0) {
								// Get the first placeholder and its path
								const [_, path] = placeholderEntries[0];

								// First remove the placeholder
								Transforms.removeNodes(editor, {
									at: path,
									match: (n) =>
										SlateElement.isElement(n) &&
										n.type === "mention-placeholder",
								});

								// Then insert plain text at the same position
								Transforms.insertText(editor, plainChar, { at: path });
							}
						} catch (error) {
							console.error("Error handling Escape for placeholder:", error);
							// Fallback - just try to insert text at current selection
							try {
								Transforms.insertText(editor, plainChar);
							} catch (e) {
								console.error("Fallback text insertion failed:", e);
							}
						}

						// Close the popover
						setMentionPopover(null);

						// Make sure to focus the editor
						setTimeout(() => {
							ReactEditor.focus(editor);
						}, 0);
						return;
					}

					// Handle Backspace to also close the popover if no text in search or empty search
					if (
						event.key === "Backspace" &&
						(!mentionPopover.search || mentionPopover.search === "")
					) {
						event.preventDefault();
						event.stopPropagation();

						// Find and process placeholders
						try {
							// Find placeholders
							const placeholderEntries = Array.from(
								Editor.nodes(editor, {
									match: (n) =>
										SlateElement.isElement(n) &&
										n.type === "mention-placeholder",
								}),
							);

							if (placeholderEntries.length > 0) {
								// Get the first placeholder and its path
								const [_, path] = placeholderEntries[0];

								// Remove the placeholder
								Transforms.removeNodes(editor, {
									at: path,
									match: (n) =>
										SlateElement.isElement(n) &&
										n.type === "mention-placeholder",
								});

								// Note: For Backspace we don't insert the character as the user is
								// explicitly trying to delete. If they want the character they can
								// type it again.
							}
						} catch (error) {
							console.error("Error handling Backspace for placeholder:", error);
						}

						// Close the popover
						setMentionPopover(null);

						// Make sure to focus the editor
						setTimeout(() => {
							ReactEditor.focus(editor);
						}, 0);
						return;
					}

					// Block Enter key when popover is open (let the popover handle selection)
					if (event.key === "Enter") {
						event.preventDefault();
						return;
					}

					// Let other keys pass through to update the search
					return;
				}

				// Handle Enter key to create new paragraphs
				if (event.key === "Enter" && !event.shiftKey) {
					// Default behavior will create new paragraphs
					return;
				}

				// Handle Shift+Enter for soft line breaks within a paragraph
				if (event.key === "Enter" && event.shiftKey) {
					event.preventDefault();

					// Insert a regular line break character - this will be rendered properly with whitespace-pre-wrap
					Transforms.insertText(editor, "\n");
					return;
				}

				// Handle @ mentions
				if (event.key === MENTION_TYPE_CONFIG.role.icon && !mentionPopover) {
					event.preventDefault();

					// Get the current selection
					const { selection } = editor;
					if (!selection || !Range.isCollapsed(selection)) return;

					// Insert a placeholder for the mention
					const mentionPlaceholder: MentionPlaceholderElement = {
						type: "mention-placeholder",
						mentionType: "role",
						children: [{ text: "" }],
					};

					Transforms.insertNodes(editor, mentionPlaceholder);

					// Position the popover near the cursor
					if (editorContainerRef.current) {
						const domSelection = window.getSelection();
						if (domSelection?.rangeCount) {
							const range = domSelection.getRangeAt(0);
							const rect = range.getBoundingClientRect();

							setMentionPopover({
								type: "role",
								search: "",
								anchor: { x: rect.left, y: rect.bottom },
							});
						}
					}
				}

				// Handle # for channel mentions
				if (event.key === MENTION_TYPE_CONFIG.channel.icon && !mentionPopover) {
					event.preventDefault();

					// Get the current selection
					const { selection } = editor;
					if (!selection || !Range.isCollapsed(selection)) return;

					// Insert a placeholder for the mention
					const mentionPlaceholder: MentionPlaceholderElement = {
						type: "mention-placeholder",
						mentionType: "channel",
						children: [{ text: "" }],
					};

					Transforms.insertNodes(editor, mentionPlaceholder);

					// Position the popover near the cursor
					if (editorContainerRef.current) {
						const domSelection = window.getSelection();
						if (domSelection?.rangeCount) {
							const range = domSelection.getRangeAt(0);
							const rect = range.getBoundingClientRect();

							setMentionPopover({
								type: "channel",
								search: "",
								anchor: { x: rect.left, y: rect.bottom },
							});
						}
					}
				}

				// Handle { for variable mentions
				if (
					event.key === MENTION_TYPE_CONFIG.variable.icon &&
					!mentionPopover
				) {
					event.preventDefault();

					// Get the current selection
					const { selection } = editor;
					if (!selection || !Range.isCollapsed(selection)) return;

					// Insert a placeholder for the mention
					const mentionPlaceholder: MentionPlaceholderElement = {
						type: "mention-placeholder",
						mentionType: "variable",
						children: [{ text: "" }],
					};

					Transforms.insertNodes(editor, mentionPlaceholder);

					// Position the popover near the cursor
					if (editorContainerRef.current) {
						const domSelection = window.getSelection();
						if (domSelection?.rangeCount) {
							const range = domSelection.getRangeAt(0);
							const rect = range.getBoundingClientRect();

							setMentionPopover({
								type: "variable",
								search: "",
								anchor: { x: rect.left, y: rect.bottom },
							});
						}
					}
				}
			} catch (error) {
				console.error("Error handling key event:", error);
			}
		},
		[editor, mentionPopover],
	);

	// Fallback textarea for when Slate encounters errors
	if (editorError || !editor) {
		return (
			<div className="relative w-full border border-input rounded-md bg-background text-sm p-3">
				{name && <input type="hidden" name={name} value={value} />}
				<div className="text-sm text-amber-600 mb-2">
					Advanced editor unavailable. Using simple editor.
				</div>
				<textarea
					value={value}
					onChange={(e) => onChange?.(e.target.value)}
					placeholder={placeholder}
					disabled={disabled}
					rows={rows}
					className="w-full p-2 border rounded focus:outline-none"
					maxLength={maxLength}
				/>
				{maxLength && (
					<div
						className={`text-xs mt-1 text-right ${value.length > (maxLength || 0) ? "text-red-500" : "text-muted-foreground"}`}
					>
						{value.length}/{maxLength}
					</div>
				)}
			</div>
		);
	}

	// Ensure we have valid initial value
	const safeInitialValue =
		internalValue.length > 0 ? internalValue : defaultValue;

	return (
		<div
			className={cn(
				"relative w-full border border-input rounded-md bg-background text-sm p-3",
				disabled ? "opacity-50 cursor-not-allowed" : "",
				className,
			)}
			ref={editorContainerRef}
			id={id}
		>
			{name && <input type="hidden" name={name} value={value} />}
			<Slate
				editor={editor}
				initialValue={safeInitialValue}
				onChange={handleSlateChange}
				key={`slate-${name || "default"}`}
			>
				<Editable
					renderElement={renderElement}
					renderLeaf={renderLeaf}
					placeholder={placeholder}
					className="focus:outline-none whitespace-pre-wrap"
					style={{ minHeight: `${Math.max(rows * 24, 100)}px` }}
					readOnly={disabled}
					onKeyDown={handleKeyDown}
				/>
				{maxLength && (
					<div
						className={`text-xs mt-1 text-right ${
							charCount > maxLength ? "text-red-500" : "text-muted-foreground"
						}`}
					>
						{charCount}/{maxLength}
					</div>
				)}
				{/* Mention popover rendering */}
				{!disabled && mentionPopover && (
					<Popover
						open={true}
						onOpenChange={(open) => {
							if (!open) {
								setMentionPopover(null);
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
						<PopoverContent className="p-0" align="start" sideOffset={5}>
							<Command>
								<CommandInput
									placeholder={
										mentionPopover.type === "role"
											? "Search roles..."
											: mentionPopover.type === "channel"
												? "Search channels..."
												: "Search variables..."
									}
									value={mentionPopover.search}
									onValueChange={(value) =>
										setMentionPopover({ ...mentionPopover, search: value })
									}
								/>
								<CommandList>
									<CommandEmpty>No results found.</CommandEmpty>
									{mentionPopover.type === "role" && (
										<CommandGroup heading="Roles">
											{roles.map((role) => (
												<CommandItem
													key={role.id}
													value={role.id}
													onSelect={() =>
														handleMentionSelect(role.id, "role", role.name)
													}
												>
													{role.name}
												</CommandItem>
											))}
										</CommandGroup>
									)}
									{mentionPopover.type === "channel" && (
										<CommandGroup heading="Channels">
											{channels.map((channel) => (
												<CommandItem
													key={channel.id}
													value={channel.id}
													onSelect={() =>
														handleMentionSelect(
															channel.id,
															"channel",
															channel.name,
														)
													}
												>
													{channel.name}
												</CommandItem>
											))}
										</CommandGroup>
									)}
									{mentionPopover.type === "variable" && (
										<CommandGroup heading="Variables">
											{variables.map((variable) => (
												<CommandItem
													key={variable.id}
													value={variable.id}
													onSelect={() =>
														handleMentionSelect(
															variable.id,
															"variable",
															variable.name,
														)
													}
												>
													{variable.name}
												</CommandItem>
											))}
										</CommandGroup>
									)}
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				)}
			</Slate>
		</div>
	);
};
