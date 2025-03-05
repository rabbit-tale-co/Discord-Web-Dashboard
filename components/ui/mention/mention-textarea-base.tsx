/**
 * MentionTextareaBase Component
 *
 * Core functionality for the mention-enabled text editor.
 * This component handles the basic Slate editor setup and core functionality
 * without the specific plugin implementation details.
 */

import type React from "react";
import { useCallback, useMemo, useState, useEffect, memo } from "react";
import type { BaseEditor, Descendant } from "slate";
import {
	createEditor,
	Transforms,
	Text,
	Element as SlateElement,
	Editor,
} from "slate";
import { Slate, Editable, withReact } from "slate-react";
import type { ReactEditor } from "slate-react";
import { withHistory } from "slate-history";
import { cn } from "@/lib/utils";

// Types

// Window with slate editor instances
interface WindowWithEditors extends Window {
	__slateEditorInstances?: Record<string, BaseEditor & ReactEditor>;
}

// Define types for guild data but don't extend Window
interface GuildData {
	id: string;
	name: string;
	roles: Array<{ id: string; name: string; color: number }>;
	channels: Array<{ id: string; name: string; type: number }>;
}

// Define custom element types
export type MentionType = "variable" | "role" | "channel";

export type MentionElement = {
	type: "mention";
	mentionType: MentionType;
	children: [{ text: "" }]; // void elements have empty text children
	value: string;
};

export type MentionPlaceholderElement = {
	type: "mention-placeholder";
	mentionType: MentionType;
	children: [{ text: "" }];
};

type ParagraphElement = {
	type: "paragraph";
	children: (CustomText | MentionElement | MentionPlaceholderElement)[];
};

type CustomText = {
	text: string;
};

export type CustomElement =
	| ParagraphElement
	| MentionElement
	| MentionPlaceholderElement;

declare module "slate" {
	interface CustomTypes {
		Editor: BaseEditor & ReactEditor;
		Element: CustomElement;
		Text: CustomText;
	}
}

// Props
export interface MentionTextareaBaseProps {
	placeholder?: string;
	onChange?: (value: string) => void;
	value?: string;
	className?: string;
	maxLength?: number;
	style?: React.CSSProperties;
	singleLine?: boolean;
	rows?: number;
	onMentionStart?: (data: {
		type: MentionType;
		search: string;
		domRect: DOMRect;
	}) => void;
	onMentionEnd?: () => void;
	onFocus?: () => void;
	onBlur?: (e: React.FocusEvent<HTMLElement>) => void;
}

// Empty value constant
const EMPTY_VALUE: ParagraphElement[] = [
	{ type: "paragraph", children: [{ text: "" }] },
];

// Cache for deserialized HTML values
const deserializationCache = new Map<string, ParagraphElement[]>();

// Window with guild data
interface WindowWithGuildData extends Window {
	__guildData?: GuildData;
}

// Function to get role name from ID
export const getRoleNameFromId = (roleId: string): string => {
	try {
		if (typeof window !== "undefined") {
			const typedWindow = window as WindowWithGuildData;
			const guildData = typedWindow.__guildData;
			if (guildData?.roles) {
				const role = guildData.roles.find((r) => r.id === roleId);
				if (role) {
					return role.name;
				}
			}
		}
	} catch (e) {
		console.error("Error getting role name:", e);
	}
	return roleId;
};

// Function to get channel name from ID
export const getChannelNameFromId = (channelId: string): string => {
	try {
		if (typeof window !== "undefined") {
			const typedWindow = window as WindowWithGuildData;
			const guildData = typedWindow.__guildData;
			if (guildData?.channels) {
				const channel = guildData.channels.find((c) => c.id === channelId);
				if (channel) {
					return channel.name;
				}
			}
		}
	} catch (e) {
		console.error("Error getting channel name:", e);
	}
	return channelId;
};

// Serialize content to HTML
export const serializeToHtml = (nodes: Descendant[]): string => {
	return nodes
		.map((node) => {
			if (Text.isText(node)) {
				return node.text;
			}

			if (SlateElement.isElement(node)) {
				if (node.type === "mention") {
					const element = node as MentionElement;
					// Store the actual value in the HTML, but style based on type
					const mentionClass =
						element.mentionType === "role"
							? "bg-blue-100 text-blue-800 border border-blue-300"
							: element.mentionType === "channel"
								? "bg-green-100 text-green-800 border border-green-300"
								: "bg-purple-100 text-purple-800 border border-purple-300";

					// Generate a human-readable version for display in HTML
					let displayText = element.value || "";

					if (element.mentionType === "role") {
						if (displayText.startsWith("<@") && displayText.endsWith(">")) {
							const roleId = displayText.substring(2, displayText.length - 1);
							const roleName = getRoleNameFromId(roleId);
							displayText = `@${roleName}`;
						}
						// If it starts with @, keep the original display text from popover
					} else if (element.mentionType === "channel") {
						if (displayText.startsWith("<#") && displayText.endsWith(">")) {
							const channelId = displayText.substring(
								2,
								displayText.length - 1,
							);
							const channelName = getChannelNameFromId(channelId);
							displayText = `#${channelName}`;
						}
						// If it starts with #, keep the original display text from popover
					}

					// Use the actual value (with IDs) as a data attribute, display the friendly name
					return `<span class="${mentionClass} rounded-md px-1 py-0.5 text-md select-all" data-slate-leaf="true" data-slate-inline="true" data-slate-void="true" contenteditable="false" data-type="mention" data-mention-type="${element.mentionType}" data-value="${element.value || ""}"><span data-slate-string="true">${displayText}</span></span>`;
				}

				if (node.type === "paragraph") {
					return `<div data-slate-node="element" style="position: relative;">${serializeToHtml(node.children)}</div>`;
				}
			}

			return "";
		})
		.join("");
};

// Deserialize HTML to Slate nodes
export const deserializeHtml = (html: string): ParagraphElement[] => {
	console.log("deserializeHtml input:", html);

	if (!html || typeof html !== "string") {
		return [...EMPTY_VALUE];
	}

	// Process text and convert variables to mention elements
	const processText = (text: string): (CustomText | MentionElement)[] => {
		console.log("Processing text:", text);
		const result: (CustomText | MentionElement)[] = [];

		// Match variables like {level}, user mentions <@id>, channel mentions <#id>, and customize mentions <id:customize>
		const pattern = /(<id:customize>|<@[^>]+>|<#[^>]+>|\{[^}]+\})/g;
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		// Use a separate assignment before the loop
		match = pattern.exec(text);
		while (match !== null) {
			console.log("Found match:", match[0], "at index:", match.index);
			// Add text before the match
			const beforeText = text.slice(lastIndex, match.index);
			if (beforeText) {
				console.log("Adding text before match:", beforeText);
				result.push({ text: beforeText });
			}

			// Add the mention element
			const value = match[0];
			let mentionType: MentionType = "variable";
			let displayValue = value;

			if (value.startsWith("{")) {
				mentionType = "variable";
			} else if (value.startsWith("<@")) {
				mentionType = "role";
			} else if (value.startsWith("<#") || value === "<id:customize>") {
				mentionType = "channel";
				if (value === "<id:customize>") {
					displayValue = "Channels & Roles";
				}
			}

			console.log("Adding mention:", {
				type: "mention",
				mentionType,
				value,
				displayValue,
			});
			result.push({
				type: "mention",
				mentionType,
				children: [{ text: "" }],
				value,
			} as MentionElement);

			lastIndex = match.index + match[0].length;
			match = pattern.exec(text);
		}

		// Add any remaining text
		const afterText = text.slice(lastIndex);
		if (afterText) {
			console.log("Adding remaining text:", afterText);
			result.push({ text: afterText });
		}

		console.log("Process text result:", result);
		return result;
	};

	// Special handling for <id:customize> tag
	if (html.includes("<id:customize>")) {
		// Fix the HTML by replacing the tag with a marker
		const fixedHtml = html.replace(/<id:customize>/g, "###ID_CUSTOMIZE###");

		// Process the fixed HTML
		const div = document.createElement("div");
		div.innerHTML = fixedHtml;

		// Get the text content
		const textContent = div.textContent || "";

		// Process the text content, replacing the marker back to <id:customize>
		const processedText = textContent.replace(
			/###ID_CUSTOMIZE###/g,
			"<id:customize>",
		);
		console.log("Processed text with restored tags:", processedText);

		// Now process the text
		const children = processText(processedText);

		// Return a paragraph with the processed children
		const result: ParagraphElement[] = [
			{
				type: "paragraph",
				children,
			},
		];

		// Cache the result
		deserializationCache.set(html, result);
		return result;
	}

	// Regular processing (original code)
	const normalizedHtml = html.replace(/>\s+</g, "><").trim();

	// Check cache first
	const cachedResult = deserializationCache.get(normalizedHtml);
	if (cachedResult) {
		return cachedResult;
	}

	const div = document.createElement("div");
	div.innerHTML = normalizedHtml;

	// Function to extract text from HTML element (unchanged)
	const getTextFromElement = (element: HTMLElement): string => {
		return element.textContent || "";
	};

	// Process the parsed HTML to create Slate nodes
	const nodes: ParagraphElement[] = [];

	// Process div children (paragraphs)
	const paragraphs = div.children.length ? div.children : [div];

	for (let i = 0; i < paragraphs.length; i++) {
		const p = paragraphs[i] as HTMLElement;
		// Extract the text content
		const textContent = getTextFromElement(p);

		// Create a paragraph element with mentions
		const paragraphElement: ParagraphElement = {
			type: "paragraph",
			children: processText(textContent),
		};

		nodes.push(paragraphElement);
	}

	// Return empty paragraph if no content was generated
	if (nodes.length === 0) {
		nodes.push({
			type: "paragraph",
			children: [{ text: "" }],
		});
	}

	// Cache the result (limit cache size to prevent memory issues)
	if (deserializationCache.size > 100) {
		const firstKey = deserializationCache.keys().next().value;
		if (firstKey) {
			deserializationCache.delete(firstKey);
		}
	}
	deserializationCache.set(normalizedHtml, nodes);

	return nodes;
};

// Element renderer component
export const Element = memo(
	({
		attributes,
		children,
		element,
	}: {
		attributes: React.HTMLAttributes<HTMLElement>;
		children: React.ReactNode;
		element: CustomElement;
	}) => {
		if (element.type === "mention") {
			// Store the actual ID/value for form submission
			const mentionElement = element as MentionElement;
			const originalValue = mentionElement.value || "";
			// Display text will be user-friendly
			let displayText = originalValue;
			let mentionStyle = "bg-discord-foreground text-discord-bg";

			if (mentionElement.mentionType === "role") {
				// For roles: Change style and extract display name
				mentionStyle = "bg-blue-100 text-blue-800 border border-blue-300";
				// If the value is in format <@123456>, display a friendly format
				if (displayText.startsWith("<@") && displayText.endsWith(">")) {
					const roleId = displayText.substring(2, displayText.length - 1);
					const roleName = getRoleNameFromId(roleId);
					displayText = `@${roleName}`;
				}
			} else if (mentionElement.mentionType === "channel") {
				// For channels: Change style and extract display name
				mentionStyle = "bg-green-100 text-green-800 border border-green-300";
				// If the value is in format <#123456>, display a friendly format
				if (displayText === "<id:customize>") {
					displayText = "Channels & Roles";
				} else if (displayText.startsWith("<#") && displayText.endsWith(">")) {
					const channelId = displayText.substring(2, displayText.length - 1);
					const channelName = getChannelNameFromId(channelId);
					displayText = `#${channelName}`;
				}
			} else {
				// For variables: keep the existing style
				mentionStyle = "bg-purple-100 text-purple-800 border border-purple-300";
			}

			return (
				<span
					{...attributes}
					className={`${mentionStyle} rounded-md px-1 py-0.5 text-md select-all`}
					contentEditable={false}
					data-mention-type={mentionElement.mentionType}
					data-value={originalValue}
				>
					{children}
					<span>{displayText}</span>
				</span>
			);
		}

		if (element.type === "mention-placeholder") {
			const placeholderElement = element as MentionPlaceholderElement;
			// Different styling based on mention type
			let placeholderIcon = "";
			let placeholderStyle = "";

			if (placeholderElement.mentionType === "role") {
				placeholderIcon = "@";
				placeholderStyle = "bg-blue-100 text-blue-800 border border-blue-300";
			} else if (placeholderElement.mentionType === "channel") {
				placeholderIcon = "#";
				placeholderStyle =
					"bg-green-100 text-green-800 border border-green-300";
			} else {
				placeholderIcon = "{";
				placeholderStyle =
					"bg-purple-100 text-purple-800 border border-purple-300";
			}

			return (
				<span
					{...attributes}
					className={`${placeholderStyle} rounded-md px-1 py-0.5 text-md select-all`}
					contentEditable={false}
				>
					{children}
					<span>{placeholderIcon}</span>
				</span>
			);
		}

		return <div {...attributes}>{children}</div>;
	},
);

Element.displayName = "SlateElement";

// Get editor instance utility
export function getEditorInstance(
	id: string,
): (BaseEditor & ReactEditor) | null {
	if (typeof window === "undefined") return null;

	try {
		const typedWindow = window as WindowWithEditors;
		const instances = typedWindow.__slateEditorInstances || {};
		return instances[id] || null;
	} catch (error) {
		console.error("Error getting editor instance:", error);
		return null;
	}
}

// Main component
export const MentionTextareaBase = memo(function MentionTextareaBase({
	placeholder = "Type your message...",
	onChange,
	value = "",
	className,
	maxLength,
	style,
	singleLine = false,
	rows = 3,
	onMentionStart,
	onMentionEnd,
	onFocus,
	onBlur,
}: MentionTextareaBaseProps) {
	console.log("MentionTextareaBase props:", {
		value,
		maxLength,
		singleLine,
		rows,
	});

	// Create editor instance
	const editor = useMemo(() => {
		const e = withHistory(withReact(createEditor()));

		// Define what elements are void (can't have editable content)
		const { isVoid, isInline } = e;

		e.isVoid = (element) => {
			return element.type === "mention" ||
				element.type === "mention-placeholder"
				? true
				: isVoid(element);
		};

		e.isInline = (element) => {
			return element.type === "mention" ||
				element.type === "mention-placeholder"
				? true
				: isInline(element);
		};

		return e;
	}, []);

	// Track focus state
	const [isFocused, setIsFocused] = useState(false);

	// Expose editor instance to window for direct access
	useEffect(() => {
		if (typeof window !== "undefined") {
			const typedWindow = window as WindowWithEditors;
			typedWindow.__slateEditorInstances =
				typedWindow.__slateEditorInstances || {};
			typedWindow.__slateEditorInstances["mention-textarea"] = editor;

			// Cleanup on unmount
			return () => {
				if (typedWindow.__slateEditorInstances) {
					// Use computed property to avoid delete operator
					typedWindow.__slateEditorInstances = {
						...typedWindow.__slateEditorInstances,
						"mention-textarea": undefined as unknown as BaseEditor &
							ReactEditor,
					};
				}
			};
		}
	}, [editor]);

	// Calculate character count
	const characterCount = useMemo(() => {
		if (!value || typeof value !== "string") return 0;
		// Simple regex to remove HTML tags for counting
		return value.replace(/<[^>]*>/g, "").length;
	}, [value]);

	// Initialize with parsed HTML
	const initialValue = useMemo(() => {
		console.log("Parsing initial value:", value);
		if (!value || typeof value !== "string") {
			console.log("Empty or invalid value, using default");
			return [...EMPTY_VALUE];
		}
		const parsed = deserializeHtml(value);
		console.log("Parsed HTML result:", parsed);
		return parsed;
	}, [value]);

	// Track the current mention state
	const [mentionState, setMentionState] = useState<{
		active: boolean;
		type: MentionType | null;
		search: string;
	}>({
		active: false,
		type: null,
		search: "",
	});

	// Editor change handler
	const handleChange = useCallback(
		(value: Descendant[]) => {
			console.log("Editor change value:", value);
			if (onChange) {
				// Use the serialization function
				const html = serializeToHtml(value);
				console.log("Serialized HTML:", html);

				// Check maxLength before processing further
				if (maxLength !== undefined) {
					const plainText =
						typeof html === "string" ? html.replace(/<[^>]*>/g, "") : "";
					if (plainText.length > maxLength) {
						// Don't update if too long
						return;
					}
				}

				onChange(html);
			}
		},
		[onChange, maxLength],
	);

	// Calculate rows class
	const rowsClass = useMemo(() => {
		if (singleLine) return "";
		return cn(
			rows === 3 ? "min-h-[72px]" : "",
			rows === 4 ? "min-h-[96px]" : "",
			rows === 5 ? "min-h-[120px]" : "",
			rows === 6 ? "min-h-[144px]" : "",
			rows > 6 ? `min-h-[${rows * 24}px]` : "",
		);
	}, [rows, singleLine]);

	// Memoize editor class names to prevent recalculations
	const editorClassNames = useMemo(() => {
		return cn(
			"w-full rounded-md border border-input bg-background text-sm",
			singleLine
				? "h-10 min-h-0 overflow-y-hidden overflow-x-auto"
				: "max-h-[50vh] overflow-y-auto",
			!singleLine && rowsClass,
			singleLine ? "pr-10 pl-3 py-2" : "px-3 py-2",
			"focus-visible:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:ring-ring",
			"whitespace-pre-wrap break-words",
			singleLine ? "resize-none" : "resize-vertical",
			className,
		);
	}, [singleLine, rowsClass, className]);

	// Handle keyboard events
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			// For single line, prevent Enter key from creating new lines
			if (singleLine && event.key === "Enter" && !event.shiftKey) {
				event.preventDefault();
				return;
			}

			const { selection } = editor;
			if (!selection) return;

			// Handle specific trigger characters for mentions
			if (["@", "#", "{"].includes(event.key) && onMentionStart) {
				event.preventDefault();

				const domSelection = window.getSelection();
				if (domSelection && domSelection.rangeCount > 0) {
					const range = domSelection.getRangeAt(0);
					const rect = range.getBoundingClientRect();

					let mentionType: MentionType = "variable";
					if (event.key === "@") mentionType = "role";
					if (event.key === "#") mentionType = "channel";
					if (event.key === "{") mentionType = "variable";

					// Insert a placeholder element with the trigger character
					Transforms.insertNodes(editor, {
						type: "mention-placeholder",
						mentionType,
						children: [{ text: event.key }],
					} as MentionPlaceholderElement);

					// Update the mention state
					setMentionState({
						active: true,
						type: mentionType,
						search: "",
					});

					// Use requestAnimationFrame instead of setTimeout for better performance
					requestAnimationFrame(() => {
						const updatedSelection = window.getSelection();
						if (updatedSelection && updatedSelection.rangeCount > 0) {
							const updatedRange = updatedSelection.getRangeAt(0);
							const updatedRect = updatedRange.getBoundingClientRect();

							onMentionStart({
								type: mentionType,
								search: "",
								domRect: updatedRect,
							});
						} else {
							onMentionStart({
								type: mentionType,
								search: "",
								domRect: rect,
							});
						}
					});
				}
				return;
			}

			// Handle Escape key to cancel mentions
			if (event.key === "Escape" && onMentionEnd) {
				event.preventDefault();

				setMentionState({ active: false, type: null, search: "" });

				const [node] = Editor.nodes(editor, {
					match: (n) =>
						SlateElement.isElement(n) && n.type === "mention-placeholder",
				});

				if (node) {
					Transforms.delete(editor, { at: node[1] });
				}

				onMentionEnd();
				return;
			}

			// Handle space key to close popover when active
			if (event.key === " " && mentionState.active && onMentionEnd) {
				setMentionState({ active: false, type: null, search: "" });

				const [node] = Editor.nodes(editor, {
					match: (n) =>
						SlateElement.isElement(n) && n.type === "mention-placeholder",
				});

				if (node) {
					Transforms.delete(editor, { at: node[1] });
				}

				onMentionEnd();
			}

			// Handle backspace to remove mention placeholder
			if (event.key === "Backspace" && mentionState.active && onMentionEnd) {
				const [node] = Editor.nodes(editor, {
					match: (n) =>
						SlateElement.isElement(n) && n.type === "mention-placeholder",
				});

				if (node) {
					const [element] = node;
					const text = (element.children[0] as { text: string }).text;

					if (text.length <= 1) {
						event.preventDefault();
						Transforms.delete(editor, { at: node[1] });
						setMentionState({ active: false, type: null, search: "" });
						onMentionEnd();
					}
				}
				return;
			}

			// Handle typing in mention placeholder
			if (
				mentionState.active &&
				onMentionStart &&
				!["Escape", "Enter", "Tab", "ArrowUp", "ArrowDown"].includes(event.key)
			) {
				const [node] = Editor.nodes(editor, {
					match: (n) =>
						SlateElement.isElement(n) && n.type === "mention-placeholder",
				});

				if (node) {
					event.preventDefault();
					const [element] = node;
					const text = (element.children[0] as { text: string }).text;

					if (event.key === "Backspace") {
						if (text.length <= 1) {
							Transforms.delete(editor, { at: node[1] });
							setMentionState({ active: false, type: null, search: "" });
							if (onMentionEnd) onMentionEnd();
						} else {
							const newText = text.slice(0, -1);
							Transforms.insertText(editor, newText, { at: node[1] });

							const domSelection = window.getSelection();
							if (domSelection && domSelection.rangeCount > 0) {
								const range = domSelection.getRangeAt(0);
								const rect = range.getBoundingClientRect();

								onMentionStart({
									type: mentionState.type as MentionType,
									search: newText.slice(1),
									domRect: rect,
								});
							}
						}
					} else {
						const newText = text + event.key;
						Transforms.insertText(editor, newText, { at: node[1] });

						const domSelection = window.getSelection();
						if (domSelection && domSelection.rangeCount > 0) {
							const range = domSelection.getRangeAt(0);
							const rect = range.getBoundingClientRect();

							onMentionStart({
								type: mentionState.type as MentionType,
								search: newText.slice(1),
								domRect: rect,
							});
						}
					}
				}
				return;
			}

			// Handle arrow key navigation to skip over mention elements
			if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
				const isLeft = event.key === "ArrowLeft";
				const { anchor } = selection;

				// Find the nearest node
				const [node, path] = Editor.node(editor, anchor);

				// Check if we're at the edge of a mention
				if (SlateElement.isElement(node) && node.type === "mention") {
					event.preventDefault();

					// Move to before or after the mention
					const newPath = isLeft
						? Editor.before(editor, path)
						: Editor.after(editor, path);

					if (newPath) {
						Transforms.select(editor, newPath);
					}
				}
			}

			// If Enter is pressed while a mention is active and there's search text
			if (
				event.key === "Enter" &&
				mentionState.active &&
				mentionState.search.length > 0
			) {
				event.preventDefault();
			}
		},
		[editor, onMentionStart, onMentionEnd, singleLine, mentionState],
	);

	// Handle focus/blur events
	const handleFocus = useCallback(() => {
		setIsFocused(true);
		if (onFocus) {
			onFocus();
		}
	}, [onFocus]);

	const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
		setIsFocused(false);
		if (onBlur) {
			onBlur(e);
		}
	};

	// Return component with optimized rendering
	return (
		<div
			className={cn("relative w-full", singleLine ? "flex items-center" : "")}
			onFocus={handleFocus}
			onBlur={handleBlur}
		>
			<Slate
				editor={editor}
				initialValue={initialValue}
				onChange={handleChange}
			>
				<Editable
					className={editorClassNames}
					renderElement={(props) => <Element {...props} />}
					onKeyDown={handleKeyDown}
					style={style}
					placeholder={placeholder}
					renderPlaceholder={({ children, attributes }) => (
						<div
							{...attributes}
							style={{
								position: "absolute",
								pointerEvents: "none",
								width: "fit-content",
								display: "block",
								opacity: "0.333",
								userSelect: "none",
								textDecoration: "none",
							}}
						>
							<p>{children}</p>
						</div>
					)}
					autoCorrect="off"
					spellCheck="true"
					data-testid="mention-textarea"
					data-slate-editor
					data-slate-node="value"
					contentEditable="true"
					suppressContentEditableWarning
				/>
			</Slate>
			{maxLength && (
				<div className="absolute bottom-1 right-2 text-xs text-muted-foreground">
					{characterCount}/{maxLength}
				</div>
			)}
		</div>
	);
});

MentionTextareaBase.displayName = "MentionTextareaBase";
