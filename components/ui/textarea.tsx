import type React from "react";
import { useCallback, useMemo } from "react";
import type { BaseEditor } from "slate";
import {
	createEditor,
	Transforms,
	Text,
	Element as SlateElement,
	type Node as SlateNode,
	Editor,
	Range,
} from "slate";
import { Slate, Editable, withReact, ReactEditor } from "slate-react";
import { withHistory } from "slate-history";
import { cn } from "@/lib/utils";

// Deklaracja globalna dla rozszerzenia Window
interface WindowWithEditors extends Window {
	__slateEditorInstances?: Record<string, BaseEditor & ReactEditor>;
}

// Add interface for extended Window with guild data
interface WindowWithGuildData extends Window {
	__guildData?: {
		roles?: Array<{ id: string; name: string }>;
		channels?: Array<{ id: string; name: string }>;
	};
}

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
	onMentionStart?: (data: {
		type: "variable" | "role" | "channel";
		search: string;
		domRect: DOMRect;
	}) => void;
	onMentionEnd?: () => void;
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

// Serialize Slate nodes to HTML
const serializeToHtml = (nodes: SlateNode[]): string => {
	return nodes
		.map((node) => {
			if (Text.isText(node)) {
				return `<span data-slate-node="text">${node.text}</span>`;
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
					let displayText = element.value;

					if (
						element.mentionType === "role" &&
						displayText.startsWith("<@") &&
						displayText.endsWith(">")
					) {
						const roleId = displayText.substring(2, displayText.length - 1);
						displayText = "@role";

						if (typeof window !== "undefined") {
							try {
								const typedWindow = window as WindowWithGuildData;
								if (typedWindow.__guildData?.roles) {
									const role = typedWindow.__guildData.roles.find(
										(r) => r.id === roleId,
									);
									if (role) {
										displayText = `@${role.name}`;
									}
								}
							} catch (e) {
								console.error(
									"Error getting role name during serialization:",
									e,
								);
							}
						}
					} else if (
						element.mentionType === "channel" &&
						displayText.startsWith("<#") &&
						displayText.endsWith(">")
					) {
						const channelId = displayText.substring(2, displayText.length - 1);
						displayText = "#channel";

						if (typeof window !== "undefined") {
							try {
								const typedWindow = window as WindowWithGuildData;
								if (typedWindow.__guildData?.channels) {
									const channel = typedWindow.__guildData.channels.find(
										(c) => c.id === channelId,
									);
									if (channel) {
										displayText = `#${channel.name}`;
									}
								}
							} catch (e) {
								console.error(
									"Error getting channel name during serialization:",
									e,
								);
							}
						}
					}

					// Use the actual value (with IDs) as a data attribute, display the friendly name
					return `<span class="${mentionClass} rounded-md px-1 py-0.5 text-md select-all" data-slate-leaf="true" data-slate-inline="true" data-slate-void="true" contenteditable="false" data-type="mention" data-mention-type="${element.mentionType}" data-value="${element.value}"><span data-slate-string="true">${displayText}</span></span>`;
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
const deserializeHtml = (html: string): ParagraphElement[] => {
	const div = document.createElement("div");
	// Usuń zbędne białe znaki z HTML przed deserializacją
	div.innerHTML = html.replace(/>\s+</g, "><").trim();

	// Process text and convert variables to mention elements
	const processText = (text: string): (CustomText | MentionElement)[] => {
		const result: (CustomText | MentionElement)[] = [];

		// Match variables like {level}, user mentions <@id>, and channel mentions <#id>
		const pattern = /(\{[^}]+\}|<@[^>]+>|<#[^>]+>)/g;
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		// Use a separate assignment before the loop
		match = pattern.exec(text);
		while (match !== null) {
			// Add text before the match
			const beforeText = text.slice(lastIndex, match.index);
			if (beforeText) {
				result.push({ text: beforeText });
			}

			// Add the mention element
			const value = match[0];
			let mentionType: "variable" | "role" | "channel" = "variable";

			if (value.startsWith("{")) {
				mentionType = "variable";
			} else if (value.startsWith("<@")) {
				mentionType = "role";
			} else if (value.startsWith("<#")) {
				mentionType = "channel";
			}

			result.push({
				type: "mention",
				mentionType,
				value,
				children: [{ text: "" }],
			});

			lastIndex = match.index + match[0].length;
			match = pattern.exec(text);
		}

		// Add any remaining text
		if (lastIndex < text.length) {
			result.push({ text: text.slice(lastIndex) });
		}

		return result;
	};

	const processNode = (node: Node): (CustomText | MentionElement)[] => {
		if (node.nodeType === Node.TEXT_NODE) {
			const text = node.textContent || "";
			return processText(text);
		}

		if (node.nodeType === Node.ELEMENT_NODE) {
			const element = node as HTMLElement;

			// Handle mention elements
			if (element.getAttribute("data-type") === "mention") {
				const mentionTypeAttr = element.getAttribute("data-mention-type");
				let mentionType: "variable" | "role" | "channel" = "variable";

				if (mentionTypeAttr === "role") {
					mentionType = "role";
				} else if (mentionTypeAttr === "channel") {
					mentionType = "channel";
				}

				// Get the value from data-value attribute if available, otherwise fallback to content
				const value =
					element.getAttribute("data-value") || element.textContent || "";

				return [
					{
						type: "mention",
						mentionType,
						value,
						children: [{ text: "" }],
					},
				];
			}

			// Process child nodes
			const children: (CustomText | MentionElement)[] = [];
			for (const child of element.childNodes) {
				children.push(...processNode(child));
			}
			return children;
		}

		return [];
	};

	// Process all nodes and flatten the result
	const children = Array.from(div.childNodes).flatMap(processNode);

	// For simple content, ensure it's properly processed
	if (html.trim() && children.length === 0) {
		// Try direct processing of the HTML content
		return [{ type: "paragraph", children: processText(html) }];
	}

	return [{ type: "paragraph", children }];
};

// Component to render the different elements
const Element = ({
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
		const originalValue = element.value;
		// Display text will be user-friendly
		let displayText = originalValue;
		let mentionStyle = "bg-discord-foreground text-discord-bg";

		if (element.mentionType === "role") {
			// For roles: Change style and extract display name
			mentionStyle = "bg-blue-100 text-blue-800 border border-blue-300";
			// If the value is in format <@123456>, display a friendly format
			if (displayText.startsWith("<@") && displayText.endsWith(">")) {
				const roleId = displayText.substring(2, displayText.length - 1);
				displayText = "@role";

				// Try to get role name from window if available
				if (typeof window !== "undefined") {
					try {
						const typedWindow = window as WindowWithGuildData;
						if (typedWindow.__guildData?.roles) {
							const role = typedWindow.__guildData.roles.find(
								(r) => r.id === roleId,
							);
							if (role) {
								displayText = `@${role.name}`;
							}
						}
					} catch (e) {
						console.error("Error getting role name:", e);
					}
				}
			}
		} else if (element.mentionType === "channel") {
			// For channels: Change style and extract display name
			mentionStyle = "bg-green-100 text-green-800 border border-green-300";
			// If the value is in format <#123456>, display a friendly format
			if (displayText.startsWith("<#") && displayText.endsWith(">")) {
				const channelId = displayText.substring(2, displayText.length - 1);
				displayText = "#channel";

				// Try to get channel name from window if available
				if (typeof window !== "undefined") {
					try {
						const typedWindow = window as WindowWithGuildData;
						if (typedWindow.__guildData?.channels) {
							const channel = typedWindow.__guildData.channels.find(
								(c) => c.id === channelId,
							);
							if (channel) {
								displayText = `#${channel.name}`;
							}
						}
					} catch (e) {
						console.error("Error getting channel name:", e);
					}
				}
			}
		} else {
			// For variables: keep the existing style
			mentionStyle = "bg-purple-100 text-purple-800 border border-purple-300";
		}

		return (
			<span
				{...attributes}
				className={`${mentionStyle} rounded-md px-1 py-0.5 text-md select-all`}
				data-slate-leaf="true"
				data-slate-inline="true"
				data-slate-void="true"
				contentEditable={false}
				data-type="mention"
				data-mention-type={element.mentionType}
				data-value={originalValue}
			>
				<span data-slate-string="true">{displayText}</span>
				{children}
			</span>
		);
	}

	if (element.type === "mention-placeholder") {
		// Different styling based on mention type
		let placeholderIcon = "";
		let placeholderStyle = "";

		if (element.mentionType === "role") {
			placeholderIcon = "@";
			placeholderStyle = "bg-blue-100 text-blue-800 border border-blue-300";
		} else if (element.mentionType === "channel") {
			placeholderIcon = "#";
			placeholderStyle = "bg-green-100 text-green-800 border border-green-300";
		} else {
			placeholderIcon = "{";
			placeholderStyle =
				"bg-purple-100 text-purple-800 border border-purple-300";
		}

		return (
			<span
				{...attributes}
				className={`${placeholderStyle} rounded-md px-1 py-0.5 text-md select-all`}
				data-slate-leaf="true"
				data-slate-inline="true"
				data-slate-void="true"
				contentEditable={false}
				data-type="mention-placeholder"
				data-mention-type={element.mentionType}
			>
				<span data-slate-string="true">{placeholderIcon}</span>
				{children}
			</span>
		);
	}

	return <div {...attributes}>{children}</div>;
};

// Main component
export function MentionTextarea({
	placeholder = "Type your message...",
	onChange,
	value = "",
	className,
	onMentionStart,
	onMentionEnd,
}: MentionTextareaProps) {
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

	// Expose editor instance to window for direct access
	if (typeof window !== "undefined") {
		const typedWindow = window as WindowWithEditors;
		typedWindow.__slateEditorInstances =
			typedWindow.__slateEditorInstances || {};
		typedWindow.__slateEditorInstances["mention-textarea"] = editor;
	}

	// Initialize with parsed HTML
	const initialValue = useMemo(() => deserializeHtml(value), [value]);

	// Handle text input to detect variable patterns and convert them to mention elements
	const handleDOMBeforeInput = useCallback(
		(e: InputEvent) => {
			const { inputType, data } = e;

			if (inputType === "insertText" && data) {
				const { selection } = editor;

				if (selection && Range.isCollapsed(selection)) {
					// Don't handle trigger characters here as they're now handled in handleKeyDown
					// to prevent them from being inserted into the editor
					if (data === "@" || data === "#" || data === "{") {
						return;
					}

					const before = Editor.before(editor, selection);

					if (before) {
						const beforeRange = {
							anchor: before,
							focus: selection.focus,
						} as Range;
						const beforeText = Editor.string(editor, beforeRange);

						// When typing the closing } for a variable
						if (beforeText.startsWith("{") && data === "}") {
							e.preventDefault();

							// Extract the variable name without {}
							const varName = beforeText.substring(1);

							// Delete the opening { and variable name
							// Find the character before 'before'
							const charBefore = Editor.before(editor, before, {
								unit: "character",
							});
							if (charBefore) {
								Transforms.delete(editor, {
									at: {
										anchor: charBefore,
										focus: selection.focus,
									} as Range,
								});

								// Insert a mention element
								Transforms.insertNodes(editor, {
									type: "mention",
									mentionType: "variable",
									value: `{${varName}}`,
									children: [{ text: "" }],
								});

								if (onMentionEnd) {
									onMentionEnd();
								}
							}

							return;
						}

						// We no longer need to check for trigger characters at the end
						// of previous text since we handle them in handleKeyDown
					}
				}
			}
		},
		[editor, onMentionEnd],
	);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			const { selection } = editor;

			if (!selection) return;

			// Handle specific trigger characters for mentions
			if (["@", "#", "{"].includes(event.key) && onMentionStart) {
				// Prevent default to avoid inserting the trigger character
				event.preventDefault();

				// Get the DOM selection and position
				const domSelection = window.getSelection();
				if (domSelection && domSelection.rangeCount > 0) {
					const range = domSelection.getRangeAt(0);
					const rect = range.getBoundingClientRect();

					let mentionType: "variable" | "role" | "channel" = "variable";
					if (event.key === "@") mentionType = "role";
					if (event.key === "#") mentionType = "channel";
					if (event.key === "{") mentionType = "variable";

					// Insert a placeholder element to show where the mention will go
					Transforms.insertNodes(editor, {
						type: "mention-placeholder",
						mentionType,
						children: [{ text: "" }],
					});

					// Call onMentionStart immediately
					onMentionStart({
						type: mentionType,
						search: "",
						domRect: rect,
					});
				}
				return;
			}

			// Handle escape to close popover
			if (event.key === "Escape" && onMentionEnd) {
				event.preventDefault();
				onMentionEnd();
				return;
			}

			// Handle space key to close popover when active
			if (event.key === " " && onMentionEnd) {
				onMentionEnd();
				// Don't prevent default - we want the space to be inserted
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

			// Handle backspace to delete entire mention elements
			if (event.key === "Backspace") {
				if (selection && Range.isCollapsed(selection)) {
					const prevPath = Editor.before(editor, selection);

					if (prevPath) {
						const [prevNode, prevNodePath] = Editor.node(editor, prevPath);

						// If previous node is a mention or placeholder, delete it entirely
						if (
							SlateElement.isElement(prevNode) &&
							(prevNode.type === "mention" ||
								prevNode.type === "mention-placeholder")
						) {
							event.preventDefault();
							Transforms.delete(editor, { at: prevNodePath });
							return;
						}
					}
				}
			}
		},
		[editor, onMentionStart, onMentionEnd],
	);

	// Helper method to insert mentions
	const insertMention = useCallback(
		(
			mentionType: "variable" | "role" | "channel",
			value: string,
			cleanup?: () => void,
		) => {
			try {
				let formattedValue = value;

				// Sprawdź czy wartość już zawiera nawiasy/znaczniki i nie dodawaj ich ponownie
				if (mentionType === "variable" && !value.startsWith("{")) {
					formattedValue = `{${value}}`;
				} else if (mentionType === "role" && !value.startsWith("<@")) {
					formattedValue = `<@${value}>`;
				} else if (mentionType === "channel" && !value.startsWith("<#")) {
					formattedValue = `<#${value}>`;
				}

				// Insert at current selection
				Transforms.insertNodes(editor, {
					type: "mention",
					mentionType,
					value: formattedValue,
					children: [{ text: "" }],
				});

				// Insert a space after the mention
				Transforms.insertText(editor, " ");

				// Ensure the selection point is after the inserted space
				const currentSelection = editor.selection;
				if (currentSelection) {
					// Move point forward to ensure it's after the space
					const point = {
						path: currentSelection.focus.path,
						offset: currentSelection.focus.offset,
					};
					Transforms.select(editor, point);
				}

				// Call the cleanup function if provided
				if (cleanup && typeof cleanup === "function") {
					cleanup();
				}

				// Call the onMentionEnd callback
				if (onMentionEnd) {
					onMentionEnd();
				}

				// Ensure editor is focused
				setTimeout(() => {
					ReactEditor.focus(editor);
				}, 0);
			} catch (error) {
				console.error("Error inserting mention:", error);
			}
		},
		[editor, onMentionEnd],
	);

	return (
		<Slate
			editor={editor}
			initialValue={initialValue}
			onChange={(value) => {
				const html = serializeToHtml(value);
				onChange?.(html);
			}}
		>
			<Editable
				className={cn(
					"w-full rounded-md border border-input bg-background text-sm",
					"min-h-[44px] max-h-[50vh] overflow-y-auto resize-none",
					"px-3 py-2",
					"focus-visible:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:ring-ring",
					"whitespace-pre-wrap break-words",
					className,
				)}
				placeholder={placeholder}
				renderElement={(props) => <Element {...props} />}
				onDOMBeforeInput={handleDOMBeforeInput}
				onKeyDown={handleKeyDown}
				spellCheck={true}
				data-testid="mention-textarea"
			/>
		</Slate>
	);
}

// Expose the insertMention method
MentionTextarea.insertMention = (
	editor: BaseEditor & ReactEditor,
	mentionType: "variable" | "role" | "channel",
	value: string,
) => {
	try {
		let formattedValue = value;

		// Sprawdź czy wartość już zawiera nawiasy/znaczniki i nie dodawaj ich ponownie
		if (mentionType === "variable" && !value.startsWith("{")) {
			formattedValue = `{${value}}`;
		} else if (mentionType === "role" && !value.startsWith("<@")) {
			formattedValue = `<@${value}>`;
		} else if (mentionType === "channel" && !value.startsWith("<#")) {
			formattedValue = `<#${value}>`;
		}

		// Insert at current selection
		Transforms.insertNodes(editor, {
			type: "mention",
			mentionType,
			value: formattedValue,
			children: [{ text: "" }],
		});

		// Insert a space after the mention
		Transforms.insertText(editor, " ");

		// Ensure the selection point is after the inserted space
		const currentSelection = editor.selection;
		if (currentSelection) {
			// Move point forward to ensure it's after the space
			const point = {
				path: currentSelection.focus.path,
				offset: currentSelection.focus.offset,
			};
			Transforms.select(editor, point);
		}

		// Ensure editor is focused
		setTimeout(() => {
			ReactEditor.focus(editor);
		}, 0);
	} catch (error) {
		console.error("Error inserting mention:", error);
	}
};

// Helper function to get editor instance by id
MentionTextarea.getEditorInstance = (
	id: string,
): (BaseEditor & ReactEditor) | null => {
	if (typeof window === "undefined") return null;
	const typedWindow = window as WindowWithEditors;
	return typedWindow.__slateEditorInstances?.[id] || null;
};
