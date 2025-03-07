import type React from "react";
import {
	useCallback,
	useMemo,
	useState,
	useEffect,
	memo,
	forwardRef,
} from "react";
import type { BaseEditor, Descendant } from "slate";
import type { Node as SlateNode } from "slate";
import {
	createEditor,
	Transforms,
	Text,
	Element as SlateElement,
	Editor,
	Range,
} from "slate";
import { Slate, Editable, withReact } from "slate-react";
import type { ReactEditor } from "slate-react";
import { withHistory } from "slate-history";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { SmileIcon } from "lucide-react";

// Deklaracja globalna dla rozszerzenia Window
interface WindowWithEditors extends Window {
	__slateEditorInstances?: Record<string, BaseEditor & ReactEditor>;
}

// Add interface for extended Window with guild data
// interface WindowWithGuildData extends Window {
// 	__guildData?: {
// 		roles?: Array<{ id: string; name: string }>;
// 		channels?: Array<{ id: string; name: string }>;
// 	};
// }

// Define custom types for Slate
type MentionElement = {
	type: "mention";
	mentionType: "variable" | "role" | "channel";
	children: [{ text: "" }]; // void elements have empty text children
	value: string;
};

type MentionPlaceholderElement = {
	type: "mention-placeholder";
	mentionType: "variable" | "role" | "channel";
	children: [{ text: "" }];
};

type ParagraphElement = {
	type: "paragraph";
	children: (CustomText | MentionElement | MentionPlaceholderElement)[];
};

type CustomText = {
	text: string;
};

type CustomElement =
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

interface MentionTextareaProps {
	placeholder?: string;
	onChange?: (value: string) => void;
	value?: string;
	className?: string;
	maxLength?: number;
	style?: React.CSSProperties;
	singleLine?: boolean;
	rows?: number;
	showEmojiPicker?: boolean;
	guildId?: string;
	onMentionStart?: (data: {
		type: "variable" | "role" | "channel";
		search: string;
		domRect: DOMRect;
	}) => void;
	onMentionEnd?: () => void;
	onFocus?: () => void;
	onBlur?: () => void;
}

export function Textarea({
	className,
	...props
}: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
				className,
			)}
			{...props}
		/>
	);
}

// Empty value constant - memoize this at module level to avoid recreation
// const EMPTY_VALUE: ParagraphElement[] = [
// 	{ type: "paragraph", children: [{ text: "" }] },
// ];

// Cache for deserialized HTML values to avoid expensive parsing operations
// const deserializationCache = new Map<string, ParagraphElement[]>();

// Function to get role name from ID
// const getRoleNameFromId = (roleId: string): string => {
// 	try {
// 		if (typeof window !== "undefined") {
// 			const typedWindow = window as WindowWithGuildData;
// 			if (typedWindow.__guildData?.roles) {
// 				const role = typedWindow.__guildData.roles.find((r) => r.id === roleId);
// 				if (role) {
// 					return role.name;
// 				}
// 			}
// 		}
// 	} catch (e) {
// 		console.error("Error getting role name:", e);
// 	}
// 	return "unknown-role";
// };

// Function to get channel name from ID
// const getChannelNameFromId = (channelId: string): string => {
// 	try {
// 		if (typeof window !== "undefined") {
// 			const typedWindow = window as WindowWithGuildData;
// 			if (typedWindow.__guildData?.channels) {
// 				const channel = typedWindow.__guildData.channels.find(
// 					(c) => c.id === channelId,
// 				);
// 				if (channel) {
// 					return channel.name;
// 				}
// 			}
// 		}
// 	} catch (e) {
// 		console.error("Error getting channel name:", e);
// 	}
// 	return "unknown-channel";
// };

// Define a version of serializeToHtml that's optimized and memoized by input
// This helps avoid recomputing the same HTML strings repeatedly
// const serializeToHtmlMemoized = (() => {
// 	const cache = new Map<string, string>();
// 	let lastInput: Descendant[] = [];
// 	let lastOutput = "";

// 	return (nodes: Descendant[]): string => {
// 		// For small inputs, simple reference check is enough
// 		if (nodes === lastInput) return lastOutput;

// 		// Stringify for cache lookup
// 		const nodeKey = JSON.stringify(nodes);
// 		const cached = cache.get(nodeKey);
// 		if (cached) return cached;

// 		// Original logic but cached
// 		const result = nodes
// 			.map((node) => {
// 				if (Text.isText(node)) {
// 					return node.text;
// 				}

// 				if (SlateElement.isElement(node)) {
// 					if (node.type === "mention") {
// 						const element = node as MentionElement;
// 						// Store the actual value in the HTML, but style based on type
// 						const mentionClass =
// 							element.mentionType === "role"
// 								? "bg-blue-100 text-blue-800 border border-blue-300"
// 								: element.mentionType === "channel"
// 									? "bg-green-100 text-green-800 border border-green-300"
// 									: "bg-purple-100 text-purple-800 border border-purple-300";

// 						// Generate a human-readable version for display in HTML
// 						let displayText = element.value || "";

// 						if (
// 							element.mentionType === "role" &&
// 							displayText.startsWith("<@") &&
// 							displayText.endsWith(">")
// 						) {
// 							const roleId = displayText.substring(2, displayText.length - 1);
// 							const roleName = getRoleNameFromId(roleId);
// 							displayText = `@${roleName}`;
// 						} else if (
// 							element.mentionType === "channel" &&
// 							displayText.startsWith("<#") &&
// 							displayText.endsWith(">")
// 						) {
// 							const channelId = displayText.substring(
// 								2,
// 								displayText.length - 1,
// 							);
// 							const channelName = getChannelNameFromId(channelId);
// 							displayText = `#${channelName}`;
// 						}

// 						// Use the actual value (with IDs) as a data attribute, display the friendly name
// 						return `<span class="${mentionClass} rounded-md px-1 py-0.5 text-md select-all" data-slate-leaf="true" data-slate-inline="true" data-slate-void="true" contenteditable="false" data-type="mention" data-mention-type="${element.mentionType}" data-value="${element.value || ""}"><span data-slate-string="true">${displayText}</span></span>`;
// 					}

// 					if (node.type === "paragraph") {
// 						return `<div data-slate-node="element" style="position: relative;">${serializeToHtmlMemoized(node.children)}</div>`;
// 					}
// 				}

// 				return "";
// 			})
// 			.join("");

// 		// Cache the result
// 		if (cache.size > 50) {
// 			// Prevent unbounded growth
// 			const firstKey = cache.keys().next().value;
// 			if (firstKey) {
// 				cache.delete(firstKey);
// 			}
// 		}
// 		cache.set(nodeKey, result);

// 		// Update last references
// 		lastInput = nodes;
// 		lastOutput = result;

// 		return result;
// 	};
// })();

// Optimize the deserializeHtml function to use caching
// const deserializeHtml = (html: string): ParagraphElement[] => {
// 	if (!html || typeof html !== "string") {
// 		return [...EMPTY_VALUE];
// 	}

// 	// Normalize the HTML to avoid cache misses due to insignificant whitespace differences
// 	const normalizedHtml = html.replace(/>\s+</g, "><").trim();

// 	// Check cache first
// 	const cachedResult = deserializationCache.get(normalizedHtml);
// 	if (cachedResult) {
// 		return cachedResult;
// 	}

// 	const div = document.createElement("div");
// 	div.innerHTML = normalizedHtml;

// 	// Process text and convert variables to mention elements
// 	const processText = (text: string): (CustomText | MentionElement)[] => {
// 		const result: (CustomText | MentionElement)[] = [];

// 		// Match variables like {level}, user mentions <@id>, channel mentions <#id> and <id:customize>id</id:customize>
// 		const pattern =
// 			/(\{[^}]+\}|<@[^>]+>|<#[^>]+>|<id:customize>\d+<\/id:customize>)/g;
// 		let lastIndex = 0;
// 		let match: RegExpExecArray | null;

// 		// Use a separate assignment before the loop
// 		match = pattern.exec(text);
// 		while (match !== null) {
// 			// Add text before the match
// 			const beforeText = text.slice(lastIndex, match.index);
// 			if (beforeText) {
// 				result.push({ text: beforeText });
// 			}

// 			// Add the mention element
// 			const value = match[0];
// 			let mentionType: "variable" | "role" | "channel" = "variable";

// 			if (value.startsWith("{")) {
// 				mentionType = "variable";
// 			} else if (value.startsWith("<@")) {
// 				mentionType = "role";
// 			} else if (value.startsWith("<#") || value.startsWith("<id:customize>")) {
// 				mentionType = "channel";
// 				// Preserve the original text for <id:customize> format
// 				if (value.startsWith("<id:customize>")) {
// 					result.push({
// 						type: "mention",
// 						mentionType,
// 						children: [{ text: "" }],
// 						value,
// 					});
// 					lastIndex = match.index + match[0].length;
// 					match = pattern.exec(text);
// 					continue;
// 				}
// 			}

// 			result.push({
// 				type: "mention",
// 				mentionType,
// 				children: [{ text: "" }],
// 				value,
// 			});

// 			lastIndex = match.index + match[0].length;
// 			match = pattern.exec(text);
// 		}

// 		// Add any remaining text
// 		const afterText = text.slice(lastIndex);
// 		if (afterText) {
// 			result.push({ text: afterText });
// 		}

// 		return result;
// 	};

// 	// Function to extract the text content from an HTML element
// 	const getTextFromElement = (element: HTMLElement): string => {
// 		return element.textContent || "";
// 	};

// 	// Process the parsed HTML to create Slate nodes
// 	const nodes: ParagraphElement[] = [];

// 	// Process div children (paragraphs)
// 	const paragraphs = div.children.length ? div.children : [div];

// 	for (let i = 0; i < paragraphs.length; i++) {
// 		const p = paragraphs[i] as HTMLElement;
// 		// Extract the text content
// 		const textContent = getTextFromElement(p);

// 		// Create a paragraph element with mentions
// 		const paragraphElement: ParagraphElement = {
// 			type: "paragraph",
// 			children: processText(textContent),
// 		};

// 		nodes.push(paragraphElement);
// 	}

// 	// Return empty paragraph if no content was generated
// 	if (nodes.length === 0) {
// 		nodes.push({
// 			type: "paragraph",
// 			children: [{ text: "" }],
// 		});
// 	}

// 	// Cache the result (limit cache size to prevent memory issues)
// 	if (deserializationCache.size > 100) {
// 		const firstKey = deserializationCache.keys().next().value;
// 		if (firstKey) {
// 			deserializationCache.delete(firstKey);
// 		}
// 	}
// 	deserializationCache.set(normalizedHtml, nodes);

// 	return nodes;
// };

// Memoize the Element component using React.memo to prevent unnecessary re-renders
// const Element = memo(
// 	({
// 		attributes,
// 		children,
// 		element,
// 	}: {
// 		attributes: React.HTMLAttributes<HTMLElement>;
// 		children: React.ReactNode;
// 		element: CustomElement;
// 	}) => {
// 		if (element.type === "mention") {
// 			// Store the actual ID/value for form submission
// 			const originalValue = element.value || "";
// 			// Display text will be user-friendly
// 			let displayText = originalValue;
// 			let mentionStyle = "bg-discord-foreground text-discord-bg";

// 			if (element.mentionType === "role") {
// 				// For roles: Change style and extract display name
// 				mentionStyle = "bg-blue-100 text-blue-800 border border-blue-300";
// 				// If the value is in format <@123456>, display a friendly format
// 				if (displayText.startsWith("<@") && displayText.endsWith(">")) {
// 					const roleId = displayText.substring(2, displayText.length - 1);
// 					const roleName = getRoleNameFromId(roleId);
// 					displayText = `@${roleName}`;
// 				}
// 			} else if (element.mentionType === "channel") {
// 				// For channels: Change style and extract display name
// 				mentionStyle = "bg-green-100 text-green-800 border border-green-300";
// 				// If the value is in format <#123456> or <id:customize>123456</id:customize>, display a friendly format
// 				if (displayText.startsWith("<#") && displayText.endsWith(">")) {
// 					const channelId = displayText.substring(2, displayText.length - 1);
// 					const channelName = getChannelNameFromId(channelId);
// 					displayText = `#${channelName}`;
// 				} else if (
// 					displayText.startsWith("<id:customize>") &&
// 					displayText.endsWith("</id:customize>")
// 				) {
// 					const channelId = displayText.substring(12, displayText.length - 13);
// 					const channelName = getChannelNameFromId(channelId);
// 					displayText = `#${channelName}`;
// 				}
// 			} else {
// 				// For variables: keep the existing style
// 				mentionStyle = "bg-purple-100 text-purple-800 border border-purple-300";
// 			}

// 			return (
// 				<span
// 					{...attributes}
// 					className={`${mentionStyle} rounded-md px-1 py-0.5 text-md select-all`}
// 					contentEditable={false}
// 					data-mention-type={element.mentionType}
// 					data-value={originalValue}
// 				>
// 					{children}
// 					<span>{displayText}</span>
// 				</span>
// 			);
// 		}

// 		if (element.type === "mention-placeholder") {
// 			// Different styling based on mention type
// 			let placeholderIcon = "";
// 			let placeholderStyle = "";

// 			if (element.mentionType === "role") {
// 				placeholderIcon = "@";
// 				placeholderStyle = "bg-blue-100 text-blue-800 border border-blue-300";
// 			} else if (element.mentionType === "channel") {
// 				placeholderIcon = "#";
// 				placeholderStyle =
// 					"bg-green-100 text-green-800 border border-green-300";
// 			} else {
// 				placeholderIcon = "{";
// 				placeholderStyle =
// 					"bg-purple-100 text-purple-800 border border-purple-300";
// 			}

// 			return (
// 				<span
// 					{...attributes}
// 					className={`${placeholderStyle} rounded-md px-1 py-0.5 text-md select-all`}
// 					contentEditable={false}
// 				>
// 					{children}
// 					<span>{placeholderIcon}</span>
// 				</span>
// 			);
// 		}

// 		return <div {...attributes}>{children}</div>;
// 	},
// );

// Optimize the getEditorInstance function with error handling and type safety
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

// Memoize the MentionTextarea component using React.memo to prevent unnecessary re-renders
// export const MentionTextarea = memo(function MentionTextarea({
// 	placeholder = "Type your message...",
// 	onChange,
// 	value = "",
// 	className,
// 	maxLength,
// 	style,
// 	singleLine = false,
// 	rows = 3,
// 	onMentionStart,
// 	onMentionEnd,
// 	onFocus,
// 	onBlur,
// }: MentionTextareaProps) {
// 	// Create editor only once per component instance
// 	const editor = useMemo(() => {
// 		const e = withHistory(withReact(createEditor()));

// 		// Define what elements are void (can't have editable content)
// 		const { isVoid, isInline } = e;

// 		e.isVoid = (element) => {
// 			return element.type === "mention" ||
// 				element.type === "mention-placeholder"
// 				? true
// 				: isVoid(element);
// 		};

// 		e.isInline = (element) => {
// 			return element.type === "mention" ||
// 				element.type === "mention-placeholder"
// 				? true
// 				: isInline(element);
// 		};

// 		return e;
// 	}, []);

// 	// Track focus state
// 	const [isFocused, setIsFocused] = useState(false);

// 	// Expose editor instance to window for direct access
// 	useEffect(() => {
// 		if (typeof window !== "undefined") {
// 			const typedWindow = window as WindowWithEditors;
// 			typedWindow.__slateEditorInstances =
// 				typedWindow.__slateEditorInstances || {};
// 			typedWindow.__slateEditorInstances["mention-textarea"] = editor;

// 			// Cleanup on unmount
// 			return () => {
// 				if (typedWindow.__slateEditorInstances) {
// 					// Use computed property to avoid delete operator
// 					typedWindow.__slateEditorInstances = {
// 						...typedWindow.__slateEditorInstances,
// 						"mention-textarea": undefined as unknown as BaseEditor &
// 							ReactEditor,
// 					};
// 				}
// 			};
// 		}
// 	}, [editor]);

// 	// Initialize with parsed HTML - improved to use cached parsing
// 	const initialValue = useMemo(() => {
// 		if (!value || typeof value !== "string") {
// 			return [...EMPTY_VALUE];
// 		}
// 		return deserializeHtml(value);
// 	}, [value]);

// 	// Track the current mention state
// 	const [mentionState, setMentionState] = useState<{
// 		active: boolean;
// 		type: "variable" | "role" | "channel" | null;
// 		search: string;
// 	}>({
// 		active: false,
// 		type: null,
// 		search: "",
// 	});

// 	// Memoize the editor change handler to prevent recreating on each render
// 	const handleChange = useCallback(
// 		(value: Descendant[]) => {
// 			if (onChange) {
// 				// Use the memoized serialization function
// 				const html = serializeToHtmlMemoized(value);

// 				// Check maxLength before processing further
// 				if (maxLength !== undefined) {
// 					const plainText =
// 						typeof html === "string" ? html.replace(/<[^>]*>/g, "") : "";
// 					if (plainText.length > maxLength) {
// 						// Don't update if too long
// 						return;
// 					}
// 				}

// 				onChange(html);
// 			}
// 		},
// 		[onChange, maxLength],
// 	);

// 	// Memoize rows class calculations
// 	const rowsClass = useMemo(() => {
// 		if (singleLine) return "";
// 		return cn(
// 			rows === 3 ? "h-[120px]" : "",
// 			rows === 4 ? "h-[150px]" : "",
// 			rows === 5 ? "h-[180px]" : "",
// 			rows === 6 ? "h-[210px]" : "",
// 			rows > 6 ? "h-[240px]" : "",
// 		);
// 	}, [rows, singleLine]);

// 	// Memoize editor class names to prevent recalculations
// 	const editorClassNames = useMemo(() => {
// 		return cn(
// 			"w-full rounded-md border border-input bg-background text-sm",
// 			singleLine
// 				? "h-10 min-h-0 overflow-y-hidden overflow-x-auto"
// 				: "max-h-[50vh] overflow-y-auto",
// 			!singleLine && rowsClass,
// 			singleLine ? "pr-10 pl-3 py-2" : "px-3 py-2",
// 			"focus-visible:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:ring-ring",
// 			"whitespace-pre-wrap break-words",
// 			singleLine ? "resize-none" : "resize-vertical",
// 			className,
// 		);
// 	}, [singleLine, rowsClass, className]);

// 	// Handle keyboard events - memoized to prevent recreation on each render
// 	const handleKeyDown = useCallback(
// 		(event: React.KeyboardEvent<HTMLDivElement>) => {
// 			// For single line, prevent Enter key from creating new lines
// 			if (singleLine && event.key === "Enter" && !event.shiftKey) {
// 				event.preventDefault();
// 				return;
// 			}

// 			const { selection } = editor;
// 			if (!selection) return;

// 			// Handle specific trigger characters for mentions
// 			if (["@", "#", "{"].includes(event.key) && onMentionStart) {
// 				event.preventDefault();

// 				const domSelection = window.getSelection();
// 				if (domSelection && domSelection.rangeCount > 0) {
// 					const range = domSelection.getRangeAt(0);
// 					const rect = range.getBoundingClientRect();

// 					let mentionType: "variable" | "role" | "channel" = "variable";
// 					if (event.key === "@") mentionType = "role";
// 					if (event.key === "#") mentionType = "channel";
// 					if (event.key === "{") mentionType = "variable";

// 					// Insert a placeholder element
// 					Transforms.insertNodes(editor, {
// 						type: "mention-placeholder",
// 						mentionType,
// 						children: [{ text: "" }],
// 					});

// 					// Update the mention state
// 					setMentionState({
// 						active: true,
// 						type: mentionType,
// 						search: "",
// 					});

// 					// Use requestAnimationFrame instead of setTimeout for better performance
// 					requestAnimationFrame(() => {
// 						const updatedSelection = window.getSelection();
// 						if (updatedSelection && updatedSelection.rangeCount > 0) {
// 							const updatedRange = updatedSelection.getRangeAt(0);
// 							const updatedRect = updatedRange.getBoundingClientRect();

// 							onMentionStart({
// 								type: mentionType,
// 								search: "",
// 								domRect: updatedRect,
// 							});
// 						} else {
// 							onMentionStart({
// 								type: mentionType,
// 								search: "",
// 								domRect: rect,
// 							});
// 						}
// 					});
// 				}
// 				return;
// 			}

// 			// Other event handling logic (kept the same as original)
// 			if (event.key === "Escape" && onMentionEnd) {
// 				event.preventDefault();

// 				setMentionState({ active: false, type: null, search: "" });

// 				const [node] = Editor.nodes(editor, {
// 					match: (n) =>
// 						SlateElement.isElement(n) && n.type === "mention-placeholder",
// 				});

// 				if (node) {
// 					Transforms.delete(editor, { at: node[1] });
// 				}

// 				onMentionEnd();
// 				return;
// 			}

// 			// Handle space key to close popover when active
// 			if (event.key === " " && mentionState.active && onMentionEnd) {
// 				setMentionState({ active: false, type: null, search: "" });

// 				const [node] = Editor.nodes(editor, {
// 					match: (n) =>
// 						SlateElement.isElement(n) && n.type === "mention-placeholder",
// 				});

// 				if (node) {
// 					Transforms.delete(editor, { at: node[1] });
// 				}

// 				onMentionEnd();
// 			}

// 			// Handle backspace to delete characters in the mention search or end the mention
// 			if (event.key === "Backspace" && mentionState.active) {
// 				if (mentionState.search.length > 0) {
// 					const newSearch = mentionState.search.slice(0, -1);
// 					setMentionState((prev) => ({ ...prev, search: newSearch }));

// 					const domSelection = window.getSelection();
// 					if (domSelection && domSelection.rangeCount > 0 && onMentionStart) {
// 						const range = domSelection.getRangeAt(0);
// 						const rect = range.getBoundingClientRect();

// 						onMentionStart({
// 							type: mentionState.type ?? "variable",
// 							search: newSearch,
// 							domRect: rect,
// 						});
// 					}

// 					event.preventDefault();
// 					return;
// 				}

// 				if (mentionState.search.length === 0 && onMentionEnd) {
// 					setMentionState({ active: false, type: null, search: "" });

// 					const [node] = Editor.nodes(editor, {
// 						match: (n) =>
// 							SlateElement.isElement(n) && n.type === "mention-placeholder",
// 					});

// 					if (node) {
// 						Transforms.delete(editor, { at: node[1] });
// 					}

// 					onMentionEnd();
// 					return;
// 				}
// 			}

// 			// Handle arrow key navigation to skip over mention elements
// 			if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
// 				const isLeft = event.key === "ArrowLeft";
// 				const { anchor } = selection;

// 				// Find the nearest node
// 				const [node, path] = Editor.node(editor, anchor);

// 				// Check if we're at the edge of a mention
// 				if (SlateElement.isElement(node) && node.type === "mention") {
// 					event.preventDefault();

// 					// Move to before or after the mention
// 					const newPath = isLeft
// 						? Editor.before(editor, path)
// 						: Editor.after(editor, path);

// 					if (newPath) {
// 						Transforms.select(editor, newPath);
// 					}
// 				}
// 			}

// 			// If Enter is pressed while a mention is active and there's search text
// 			if (
// 				event.key === "Enter" &&
// 				mentionState.active &&
// 				mentionState.search.length > 0
// 			) {
// 				event.preventDefault();
// 			}
// 		},
// 		[editor, onMentionStart, onMentionEnd, singleLine, mentionState],
// 	);

// 	// Handle focus/blur events
// 	const handleFocus = useCallback(() => {
// 		setIsFocused(true);
// 		if (onFocus) {
// 			onFocus();
// 		}
// 	}, [onFocus]);

// 	const handleBlur = useCallback(() => {
// 		setIsFocused(false);
// 		if (onBlur) {
// 			onBlur();
// 		}
// 	}, [onBlur]);

// 	// Return component with optimized rendering
// 	return (
// 		<div
// 			id="mention-textarea"
// 			className={cn("relative w-full", singleLine ? "flex items-center" : "")}
// 			onFocus={handleFocus}
// 			onBlur={handleBlur}
// 		>
// 			<Slate
// 				editor={editor}
// 				initialValue={initialValue}
// 				onChange={handleChange}
// 			>
// 				<Editable
// 					id="content-editable"
// 					className={editorClassNames}
// 					renderElement={(props) => <Element {...props} />}
// 					renderPlaceholder={({ children, attributes }) => (
// 						<div
// 							{...attributes}
// 							style={{
// 								position: "absolute",
// 								pointerEvents: "none",
// 								width: "fit-content",
// 								display: "block",
// 								opacity: "0.333",
// 								userSelect: "none",
// 								textDecoration: "none",
// 							}}
// 						>
// 							<p>{children}</p>
// 						</div>
// 					)}
// 					onKeyDown={handleKeyDown}
// 					style={style}
// 					placeholder={placeholder}
// 					autoCorrect="off"
// 					spellCheck="true"
// 					data-testid="mention-textarea"
// 					data-slate-editor
// 					data-slate-node="value"
// 					contentEditable="true"
// 					suppressContentEditableWarning
// 				/>
// 			</Slate>
// 		</div>
// 	);
// });
