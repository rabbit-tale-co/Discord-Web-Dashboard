"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { BaseEditor, Descendant, Range as SlateRange } from "slate";
import {
	Editor,
	Transforms,
	Text,
	Element as SlateElement,
	createEditor,
} from "slate";
import { Slate, Editable, withReact, type ReactEditor } from "slate-react";
import { withHistory } from "slate-history";
import { useParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { getCachedData } from "@/lib/cache";
import type { GuildData } from "@/types/guild";
import { useUser } from "@/hooks/use-user";

// If you want a popover UI for mention suggestions, you can import your own popover components here.
// import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
// import { Command, CommandList, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

// Extend the `window` object so we can store the editor instance globally (optional).
interface WindowWithEditors extends Window {
	__slateEditorInstances?: Record<string, BaseEditor & ReactEditor>;
}

// Extend window for guild data caching (roles/channels).
interface WindowWithGuildData extends Window {
	__guildData?: GuildData;
}

type MentionType = "variable" | "role" | "channel";

// Mention element
interface MentionElement {
	type: "mention";
	mentionType: MentionType;
	value: string; // e.g. "<@1234>", "<#5678>", "{varName}"
	displayValue: string; // The human-readable display value
	children: [{ text: "" }]; // void element child
}

// Mention placeholder (when user has typed "@" or "#" but hasn't selected yet).
interface MentionPlaceholderElement {
	type: "mention-placeholder";
	mentionType: MentionType;
	children: [{ text: string }]; // store partial user-typed text in `text`
}

// Basic paragraph
interface ParagraphElement {
	type: "paragraph";
	children: Array<CustomText | MentionElement | MentionPlaceholderElement>;
}

type CustomText = { text: string };

type CustomElement =
	| ParagraphElement
	| MentionElement
	| MentionPlaceholderElement;

// Let Slate know about our custom types
declare module "slate" {
	interface CustomTypes {
		Editor: BaseEditor & ReactEditor;
		Element: CustomElement;
		Text: CustomText;
	}
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
	rows?: number;
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
}: MentionTextareaProps) {
	// Get guildId from URL params
	const params = useParams();
	console.log("URL Params:", params);
	const guildId = params.id as string;
	console.log("Extracted guildId:", guildId);

	// Roles and channels from localStorage
	const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
	const [channels, setChannels] = useState<Array<{ id: string; name: string }>>(
		[],
	);

	// Get bot data using useUser hook
	const { userData: botData } = useUser(process.env.NEXT_PUBLIC_BOT_ID || "");

	/** Load guild data from localStorage on mount */
	useEffect(() => {
		try {
			const cacheKey = `guild-${guildId}`;
			const cached = getCachedData<GuildData>(cacheKey);

			if (cached?.data) {
				setRoles(cached.data.roles || []);
				setChannels(cached.data.channels || []);
			} else {
				console.log("No cached data found or data is invalid");
			}
		} catch (err) {
			console.error("Failed to load guild data from local cache:", err);
		}
	}, [guildId]);

	/** Create the Slate editor instance exactly once. */
	const editor = useMemo(() => {
		const e = withHistory(withReact(createEditor()));

		// Extend `isVoid` and `isInline` for mention elements
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

	/** Expose this editor instance globally so we can do programmatic insertions. */
	useEffect(() => {
		if (typeof window !== "undefined") {
			const typedWindow = window as WindowWithEditors;
			if (!typedWindow.__slateEditorInstances) {
				typedWindow.__slateEditorInstances = {};
			}
			typedWindow.__slateEditorInstances["mention-textarea"] = editor;
		}
	}, [editor]);

	/** Convert the incoming HTML string -> Slate nodes. */
	const initialValue = useMemo(() => {
		if (!value) return [...EMPTY_VALUE];

		// First, escape any existing HTML tags that shouldn't be parsed
		const escapedValue = value
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");

		// Replace both <id:customize> and plain "Roles & Channels" text with our special span
		const processedValue = escapedValue
			.replace(
				/&lt;id:customize&gt;/g,
				'<span class="mention-tag channel" data-type="mention" data-value="<id:customize>" data-mention-type="channel" contenteditable="false">Roles & Channels</span>',
			)
			.replace(
				/Roles &amp; Channels/g,
				'<span class="mention-tag channel" data-type="mention" data-value="<id:customize>" data-mention-type="channel" contenteditable="false">Roles & Channels</span>',
			);

		return deserializeHtml(processedValue);
	}, [value]);

	/** On every Slate change, re-serialize to HTML and fire `onChange`. */
	const handleEditorChange = useCallback(
		(newValue: Descendant[]) => {
			// 1) convert to HTML with transformation options
			const html = serializeToHtml(newValue, {
				roles,
				channels,
				botId: botData?.id,
				botName: botData?.username,
			});

			// 2) check length if `maxLength` is given
			if (maxLength !== undefined && maxLength > 0) {
				const plainText = html.replace(/<[^>]*>/g, ""); // remove tags
				if (plainText.length > maxLength) {
					// If it's exceeded, just do nothing or revert
					return;
				}
			}

			// 3) call onChange
			onChange?.(html);
		},
		[maxLength, onChange, roles, channels, botData],
	);

	/** Keep track of focus so we can style the container if needed. */
	const [focused, setFocused] = useState(false);
	const handleFocus = useCallback(() => {
		setFocused(true);
		onFocus?.();
	}, [onFocus]);

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLDivElement>) => {
			setFocused(false);
			onBlur?.(e);
		},
		[onBlur],
	);

	/**
	 * If you want to handle mention triggers internally, you can do so here:
	 * (For instance, if user types `@`, we open a mention popover.)
	 */
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			// If single line and press Enter, prevent new line:
			if (singleLine && e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				return;
			}

			// Basic mention triggers (@, #, {).
			if (["@", "#", "{"].includes(e.key) && onMentionStart) {
				e.preventDefault();
				const domSel = window.getSelection();
				if (domSel && domSel.rangeCount > 0) {
					const range = domSel.getRangeAt(0);
					const rect = range.getBoundingClientRect();

					let mentionType: MentionType = "variable";
					if (e.key === "@") mentionType = "role";
					if (e.key === "#") mentionType = "channel";

					// Insert a placeholder so user can keep typing
					Transforms.insertNodes(editor, {
						type: "mention-placeholder",
						mentionType,
						children: [{ text: e.key }], // store typed char
					});
					onMentionStart({
						type: mentionType,
						search: "",
						domRect: rect,
					});
				}
			}

			// If pressing Escape, close mention popover
			if (e.key === "Escape" && onMentionEnd) {
				onMentionEnd();
			}
		},
		[singleLine, onMentionStart, onMentionEnd, editor],
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
		className,
	);

	return (
		<div className="relative w-full" onFocus={handleFocus} onBlur={handleBlur}>
			<Slate
				editor={editor}
				initialValue={initialValue}
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
							roles={roles}
							channels={channels}
						/>
					)}
				/>
			</Slate>
		</div>
	);
}

/* -------------------------------------------------------------
   RENDER: MENTION ELEMENT
   ------------------------------------------------------------- */
function MentionElementRenderer({
	element,
	attributes,
	children,
	roles,
	channels,
}: {
	element: CustomElement;
	attributes: React.HTMLAttributes<HTMLElement>;
	children: React.ReactNode;
	roles: Array<{ id: string; name: string }>;
	channels: Array<{ id: string; name: string }>;
}) {
	if (element.type === "mention") {
		const mention = element as MentionElement;
		let displayText = mention.displayValue;
		let mentionStyle = "bg-purple-100 text-purple-800 border-purple-300";

		console.log("Rendering mention:", {
			type: mention.mentionType,
			value: mention.value,
			displayValue: mention.displayValue,
			availableChannels: channels,
			availableRoles: roles,
		});

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
				{placeholder.children[0]?.text || ""}
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
): string {
	return nodes
		.map((node) => {
			if (Text.isText(node)) {
				return transformText(node.text, transformOptions);
			}
			if (SlateElement.isElement(node)) {
				switch (node.type) {
					case "mention": {
						const mention = node as MentionElement;
						const safeValue = mention.value || "";

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

						return `<span data-type="mention" data-value="${safeValue}" contenteditable="false">${displayValue}</span>`;
					}
					case "paragraph":
						return `<p>${serializeToHtml(node.children, transformOptions)}</p>`;
					case "mention-placeholder": {
						const m = node as MentionPlaceholderElement;
						return `<span data-type="mention-placeholder" data-value="${m.children[0]?.text}"></span>`;
					}
					default: {
						const unknownElement = node as { children?: Descendant[] };
						return unknownElement.children
							? serializeToHtml(unknownElement.children, transformOptions)
							: "";
					}
				}
			}
			return "";
		})
		.join("");
}

/* -------------------------------------------------------------
   DESERIALIZE: from HTML -> Slate
   ------------------------------------------------------------- */
function deserializeHtml(html: string): ParagraphElement[] {
	if (!html || typeof html !== "string") return [...EMPTY_VALUE];

	const cached = deserializationCache.get(html);
	if (cached) return cached;

	// Pre-process any remaining "Roles & Channels" text that might be in plain text
	const processedHtml = html.replace(
		/Roles & Channels/g,
		'<span data-type="mention" data-value="<id:customize>" data-mention-type="channel" contenteditable="false">Roles & Channels</span>',
	);

	const div = document.createElement("div");
	div.innerHTML = processedHtml;

	const result: ParagraphElement[] = [];
	const currentParagraph: Array<CustomText | MentionElement> = [];

	// Helper function to process text and extract mentions
	const processText = (text: string): Array<CustomText | MentionElement> => {
		const parts: Array<CustomText | MentionElement> = [];
		let currentIndex = 0;

		// Regular expressions for different types of mentions
		const mentionRegex = /<(@&?\d+|#\d+)>|\{([^}]+)\}|<id:([^>]+?)>/g;

		// Process all matches
		const processNextMatch = () => {
			const match = mentionRegex.exec(text);
			if (!match) return false;

			// Add text before the mention, preserving spaces
			if (match.index > currentIndex) {
				parts.push({ text: text.slice(currentIndex, match.index) });
			}

			const fullMatch = match[0];
			let mentionType = guessMentionType(fullMatch);
			let displayValue = fullMatch;

			// Special handling for <id:customize>
			if (fullMatch.startsWith("<id:")) {
				const id = fullMatch.slice(4, -1);
				if (id.toLowerCase() === "customize") {
					displayValue = "Roles & Channels";
					mentionType = "channel";
				}
			}

			// Create mention element based on the type
			const mentionElement: MentionElement = {
				type: "mention",
				mentionType,
				value: fullMatch,
				displayValue,
				children: [{ text: "" }],
			};

			parts.push(mentionElement);
			currentIndex = match.index + fullMatch.length;
			return true;
		};

		// Process all matches
		while (processNextMatch()) {
			// Continue processing
		}

		// Add remaining text, preserving spaces
		if (currentIndex < text.length) {
			parts.push({ text: text.slice(currentIndex) });
		}

		return parts;
	};

	// Process all nodes
	const processNode = (node: Node) => {
		if (node.nodeType === Node.TEXT_NODE) {
			const text = node.textContent || "";
			if (text) {
				currentParagraph.push(...processText(text));
			}
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			const el = node as HTMLElement;
			if (el.tagName === "BR" || el.tagName === "P") {
				if (currentParagraph.length > 0) {
					result.push({ type: "paragraph", children: [...currentParagraph] });
					currentParagraph.length = 0;
				}
				if (el.tagName === "P") {
					for (const child of el.childNodes) {
						processNode(child);
					}
					if (currentParagraph.length > 0) {
						result.push({ type: "paragraph", children: [...currentParagraph] });
						currentParagraph.length = 0;
					}
				}
			} else if (el.dataset?.type === "mention") {
				const val = el.dataset.value || "";
				let displayValue = el.textContent || val;

				if (
					val.startsWith("<id:") &&
					val.slice(4, -1).toLowerCase() === "customize"
				) {
					displayValue = "Roles & Channels";
				}

				currentParagraph.push({
					type: "mention",
					mentionType: guessMentionType(val),
					value: val,
					displayValue,
					children: [{ text: "" }],
				});
			} else {
				for (const child of el.childNodes) {
					processNode(child);
				}
			}
		}
	};

	// Process all block nodes
	for (const node of div.childNodes) {
		processNode(node);
	}

	// Add any remaining content as a final paragraph
	if (currentParagraph.length > 0) {
		result.push({ type: "paragraph", children: [...currentParagraph] });
	}

	if (result.length === 0) {
		result.push({ type: "paragraph", children: [{ text: "" }] });
	}

	deserializationCache.set(html, result);
	return result;
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
	channels?: Array<{ id: string; name: string }>;
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
