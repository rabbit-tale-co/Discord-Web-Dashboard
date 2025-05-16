"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Editor,
	Transforms,
	createEditor,
	Range,
	type Descendant,
	Element as SlateElement,
	type Node as SlateNode,
	type NodeEntry,
	Text,
	Path,
} from "slate";
import { withHistory } from "slate-history";
import {
	Editable,
	ReactEditor,
	type RenderElementProps,
	type RenderLeafProps,
	Slate,
	useFocused,
	useSelected,
	withReact,
} from "slate-react";
import { useParams } from "next/navigation";
import type { BaseEditor } from "slate";

import { cn } from "@/lib/utils";
import type { MentionType } from "./types";
import { getCachedData } from "@/lib/cache";
import type { GuildData, RawChannel } from "@/types/guild";
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

// Extend the Range type to include our custom properties
declare module "slate" {
	interface BaseRange {
		bold?: boolean;
		italic?: boolean;
		code?: boolean;
		text?: string;
		title?: boolean;
		list?: boolean;
		hr?: boolean;
		blockquote?: boolean;
		url?: boolean;
		keyword?: boolean;
		punctuation?: boolean;
		strikethrough?: boolean;
		underline?: boolean;
		spoiler?: boolean;
	}

	// Define custom element types for the editor
	interface CustomTypes {
		Editor: BaseEditor & ReactEditor;
		Element:
			| ParagraphElement
			| StarWarsMentionElement
			| MentionPlaceholderElement
			| SpoilerElement;
		Text: CustomText;
	}
}

// Define a CustomText interface with formatting properties
interface CustomText {
	text: string;
	bold?: boolean;
	italic?: boolean;
	code?: boolean;
	underline?: boolean;
	strikethrough?: boolean;
	spoiler?: boolean;
	title?: boolean;
	list?: boolean;
	hr?: boolean;
	blockquote?: boolean;
	url?: boolean;
	keyword?: boolean;
	punctuation?: boolean;
}

// Basic paragraph element
interface ParagraphElement {
	type: "paragraph";
	children: Array<CustomText | StarWarsMentionElement | SpoilerElement>;
}

// MentionPlaceholderElement structure
interface MentionPlaceholderElement {
	type: "mention-placeholder";
	mentionType: MentionType;
	children: [{ text: "" }];
}

// Add a Spoiler element interface
interface SpoilerElement {
	type: "spoiler";
	children: [{ text: string }];
}

// StarWars character mention element structure
interface StarWarsMentionElement {
	type: "mention";
	mentionType: MentionType;
	value: string;
	displayValue: string;
	needsUpdate?: boolean;
	children: [{ text: "" }];
}

type RenderElementPropsFor<T extends SlateElement> = RenderElementProps & {
	element: T;
};

// Define a custom editor type for this test component
interface TestCustomEditor extends ReactEditor {
	isInline: (element: SlateElement) => boolean;
	isVoid: (element: SlateElement) => boolean;
	markableVoid: (element: SlateElement) => boolean;
	normalizeNode: (entry: NodeEntry) => void;
	insertText: (text: string) => void;
}

// Define props interface for the component
interface TestMentionTextareaProps {
	name?: string;
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	rows?: number;
	maxLength?: number;
	id?: string;
}

/** CUSTOM RENDER LEAF PROPS **/
type CustomRenderLeafProps = Omit<RenderLeafProps, "leaf"> & {
	leaf: CustomText;
};

/** ---------------------
 * HELPER FUNCTIONS
 * --------------------- **/

// Helper to insert a mention (role or variable) at an existing placeholder.
const insertMentionAtPlaceholder = (
	editor: TestCustomEditor,
	mention: StarWarsMentionElement,
) => {
	try {
		const [placeholderEntry] = Editor.nodes(editor, {
			match: (n) =>
				SlateElement.isElement(n) && n.type === "mention-placeholder",
		});
		if (placeholderEntry) {
			const [_, path] = placeholderEntry;
			Transforms.removeNodes(editor, { at: path });
			Transforms.insertNodes(editor, mention as unknown as SlateNode, {
				at: path,
			});
			const after = Editor.after(editor, path);
			if (after) {
				Transforms.select(editor, after);
			} else {
				const end = Editor.end(editor, []);
				Transforms.insertNodes(editor, { text: " " }, { at: end });
				Transforms.select(editor, Editor.after(editor, end) || end);
			}
			ReactEditor.focus(editor);
			setTimeout(() => ReactEditor.focus(editor), 10);
		} else {
			Transforms.insertNodes(editor, mention as unknown as SlateNode);
			Transforms.move(editor);
			ReactEditor.focus(editor);
		}
	} catch (err) {
		Transforms.insertNodes(editor, mention as unknown as SlateNode);
		Transforms.move(editor);
		ReactEditor.focus(editor);
	}
};

// Helper to DRY the inline formatting transformation logic.
const applyInlineFormat = (
	editor: TestCustomEditor,
	path: number[],
	text: string,
	match: RegExpExecArray,
	formatProp: keyof CustomText,
	markerLength: number,
) => {
	const start = match.index;
	const end = start + match[0].length;
	const content = match[1];
	const beforeText = text.slice(0, start);
	const afterText = text.slice(end);
	let currentOffset: number | null = null;
	if (editor.selection && Path.equals(editor.selection.anchor.path, path)) {
		currentOffset = editor.selection.anchor.offset;
	}
	const wasFocused = ReactEditor.isFocused(editor);
	const parentPath = Path.parent(path);
	const index = path[path.length - 1];

	Editor.withoutNormalizing(editor, () => {
		Transforms.removeNodes(editor, { at: path });
		const newNodes: SlateNode[] = [];
		if (beforeText) newNodes.push({ text: beforeText });
		newNodes.push({ text: content, [formatProp]: true } as CustomText);
		if (afterText) newNodes.push({ text: afterText });
		Transforms.insertNodes(editor, newNodes, { at: parentPath.concat(index) });

		if (currentOffset !== null) {
			let newPath: number[];
			let newOffset: number;

			if (currentOffset <= beforeText.length) {
				newPath = parentPath.concat(index);
				newOffset = currentOffset;
			} else if (currentOffset <= beforeText.length + match[0].length) {
				newPath = parentPath.concat(index + (beforeText ? 1 : 0));
				newOffset = currentOffset - beforeText.length - markerLength;
				newOffset = Math.max(0, Math.min(newOffset, content.length));
			} else {
				newPath = parentPath.concat(index + (beforeText ? 2 : 1));
				newOffset = currentOffset - (beforeText.length + match[0].length);
			}

			Transforms.select(editor, { path: newPath, offset: newOffset });
		}
		if (wasFocused) {
			ReactEditor.focus(editor);
		}
	});
};

/** ---------------------
 * MAIN COMPONENT
 * --------------------- **/

const TestMentionTextarea = ({
	name,
	value = "",
	onChange,
	placeholder = "Type '@' to mention someone...",
	className,
	disabled = false,
	rows = 3,
	maxLength,
	id,
}: TestMentionTextareaProps) => {
	const params = useParams();
	const guildId = params.id as string;

	const processMentionElement = useCallback(
		(element: HTMLElement, paragraph: ParagraphElement) => {
			const value = element.getAttribute("data-value") || "";
			const mentionType =
				(element.getAttribute("data-mention-type") as MentionType) ||
				"variable";
			const displayValue =
				element.getAttribute("data-display") || element.textContent || value;
			const needsUpdate = element.getAttribute("data-needs-update") === "true";

			paragraph.children.push({
				type: "mention",
				mentionType,
				value,
				displayValue,
				needsUpdate,
				children: [{ text: "" }],
			});
		},
		[],
	);

	const processNode = useCallback(
		(node: Node, paragraph: ParagraphElement) => {
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent || "";
				if (text.trim() || text) {
					paragraph.children.push({ text });
				}
				return;
			}

			if (node.nodeType === Node.ELEMENT_NODE) {
				const element = node as HTMLElement;

				if (
					element.tagName === "SPAN" &&
					element.getAttribute("data-type") === "mention"
				) {
					processMentionElement(element, paragraph);
					return;
				}

				if (
					element.tagName === "SPAN" &&
					element.getAttribute("data-type") === "spoiler"
				) {
					const value = element.getAttribute("data-value") || "";
					paragraph.children.push({
						type: "spoiler",
						children: [{ text: value }],
					});
					return;
				}

				if (element.tagName === "STRONG") {
					paragraph.children.push({
						text: element.textContent || "",
						bold: true,
					});
					return;
				}

				if (element.tagName === "S") {
					paragraph.children.push({
						text: element.textContent || "",
						strikethrough: true,
					});
					return;
				}

				if (element.tagName === "U") {
					paragraph.children.push({
						text: element.textContent || "",
						underline: true,
					});
					return;
				}

				for (const childNode of element.childNodes) {
					processNode(childNode, paragraph);
				}
			}
		},
		[processMentionElement],
	);

	const processLineToSlateNode = useCallback(
		(line: string): Descendant => {
			const processedValue = line.replace(
				/(\{([^}]+)\}|@([^\s]+)|<#(\d+)>|#([^\s<>]+))/g,
				(match, full, variable, role, channelId, channel) => {
					if (variable) {
						return `<span data-type="mention" data-mention-type="variable" data-value="${variable}">${variable}</span>`;
					}
					if (role) {
						return `<span data-type="mention" data-mention-type="role" data-value="${role}">${role}</span>`;
					}
					if (channelId) {
						return `<span data-type="mention" data-mention-type="channel" data-value="${channelId}" data-needs-update="true">${channelId}</span>`;
					}
					if (channel) {
						return `<span data-type="mention" data-mention-type="channel" data-value="${channel}" data-display="${channel}">${channel}</span>`;
					}
					return match;
				},
			);

			const markdownProcessed = processedValue.replace(
				/(\*\*([^*]+)\*\*|~~([^~]+)~~|__([^_]+)__|\|\|([^|]+)\|\|)/g,
				(match, full, bold, strike, underline, spoiler) => {
					if (bold) return `<strong>${bold}</strong>`;
					if (strike) return `<s>${strike}</s>`;
					if (underline) return `<u>${underline}</u>`;
					if (spoiler)
						return `<span data-type="spoiler" data-value="${spoiler}">${spoiler}</span>`;
					return match;
				},
			);

			const parser = new DOMParser();
			const doc = parser.parseFromString(
				`<div>${markdownProcessed}</div>`,
				"text/html",
			);
			const rootNode = doc.body.firstChild;

			const paragraph: ParagraphElement = {
				type: "paragraph",
				children: [],
			};

			if (rootNode) {
				for (const node of rootNode.childNodes) {
					processNode(node, paragraph);
				}
			}

			if (paragraph.children.length === 0 && line === "") {
				return { type: "paragraph", children: [{ text: "" }] };
			}

			return paragraph as Descendant;
		},
		[processNode],
	);

	const parseInputValue = useCallback(
		(input: string): Descendant[] => {
			if (!input) {
				return [{ type: "paragraph", children: [{ text: "" }] }];
			}
			try {
				if (input === "") {
					return [{ type: "paragraph", children: [{ text: "" }] }];
				}

				let paragraphs: Descendant[] = [];
				const lines = input.split("\n");
				for (const line of lines) {
					const paragraph = processLineToSlateNode(line);
					paragraphs.push(paragraph);
				}
				if (paragraphs.length === 0) {
					paragraphs = [{ type: "paragraph", children: [{ text: input }] }];
				}
				return paragraphs;
			} catch (err) {
				return [{ type: "paragraph", children: [{ text: input }] }];
			}
		},
		[processLineToSlateNode],
	);

	const initialValueProcessedRef = useRef(false);
	const initialValue = useMemo(() => {
		initialValueProcessedRef.current = false;
		return parseInputValue(value);
	}, [value, parseInputValue]);

	const [internalValue, setInternalValue] =
		useState<Descendant[]>(initialValue);
	const [charCount, setCharCount] = useState(0);
	const [mentionPopover, setMentionPopover] = useState<{
		type: MentionType;
		search: string;
		anchor: { x: number; y: number } | null;
	} | null>(null);
	const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
	const [channels, setChannels] = useState<RawChannel[]>([]);

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
				initialValueProcessedRef.current = false;
			}
		} catch (err) {}
	}, [guildId]);

	const createChannelMap = useCallback(
		(channels: RawChannel[]): Record<string, string> => {
			const channelMap: Record<string, string> = {};
			for (const channel of channels) {
				if (channel.id && channel.name) {
					channelMap[channel.id] = channel.name;
				}
			}
			return channelMap;
		},
		[],
	);

	const createRoleMap = useCallback(
		(roles: Array<{ id: string; name: string }>): Record<string, string> => {
			const roleMap: Record<string, string> = {};
			for (const role of roles) {
				roleMap[role.id] = role.name;
			}
			return roleMap;
		},
		[],
	);

	const updateChannelDisplayValue = useCallback(
		(
			channelId: string,
			currentDisplayValue: string,
			channelMap: Record<string, string>,
		): { needsUpdate: boolean; newDisplayValue: string } => {
			const channelName = channelMap[channelId];
			if (channelName && channelName !== currentDisplayValue) {
				return { needsUpdate: true, newDisplayValue: channelName };
			}
			return { needsUpdate: false, newDisplayValue: currentDisplayValue };
		},
		[],
	);

	const updateDOMChannelMentions = useCallback(
		(channelMap: Record<string, string>) => {
			setTimeout(() => {
				if (!editorContainerRef.current) return;
				const mentionElements = editorContainerRef.current.querySelectorAll(
					'[data-mention-type="channel"]',
				);
				let updatesCount = 0;
				for (const element of mentionElements) {
					const channelId = element.getAttribute("data-value");
					if (!channelId) return;
					const channelName = channelMap[channelId];
					if (!channelName) return;
					const displayText = `#${channelName}`;
					if (element.textContent !== displayText) {
						element.textContent = displayText;
						updatesCount++;
					}
				}
			}, 100);
		},
		[],
	);

	const updateMentionsInValue = useCallback(
		(value: Descendant[]) => {
			let hasChanges = false;
			const channelMap =
				channels?.reduce(
					(acc, channel) => {
						acc[channel.id] = channel.name;
						return acc;
					},
					{} as Record<string, string>,
				) || {};
			const roleMap =
				roles?.reduce(
					(acc, role) => {
						acc[role.id] = role.name;
						return acc;
					},
					{} as Record<string, string>,
				) || {};

			const updateMentionsRecursive = (nodes: Descendant[]): Descendant[] => {
				return nodes.map((node) => {
					if (!Editor.isEditor(node) && SlateElement.isElement(node)) {
						if (node.type === "mention" && "mentionType" in node) {
							if (node.mentionType === "channel" && channelMap) {
								const channelId = node.value;
								const channelName = channelMap[channelId] || "NOT FOUND";
								if (
									node.displayValue !== channelName &&
									channelName !== "NOT FOUND"
								) {
									hasChanges = true;
									return {
										...node,
										displayValue: channelName,
									} as StarWarsMentionElement;
								}
							} else if (node.mentionType === "role" && roleMap) {
								const roleId = node.value;
								const roleName = roleMap[roleId] || "NOT FOUND";
								if (
									node.displayValue !== roleName &&
									roleName !== "NOT FOUND"
								) {
									hasChanges = true;
									return {
										...node,
										displayValue: roleName,
									} as StarWarsMentionElement;
								}
							}
						}
						if ("children" in node) {
							const newChildren = updateMentionsRecursive(node.children);
							return { ...node, children: newChildren } as Descendant;
						}
					}
					return node;
				}) as Descendant[];
			};

			const updatedValue = updateMentionsRecursive(value);
			return { updatedValue, hasChanges };
		},
		[channels, roles],
	);

	const updateAllChannelMentions = useCallback(() => {
		if (!channels || channels.length === 0) return;
		const channelMap = createChannelMap(channels);
		const updatedValue = JSON.parse(JSON.stringify(internalValue));
		const { updatedValue: updatedInternalValue, hasChanges } =
			updateMentionsInValue(updatedValue);
		if (hasChanges) {
			setInternalValue(updatedInternalValue);
		}
		updateDOMChannelMentions(channelMap);
	}, [
		channels,
		internalValue,
		updateMentionsInValue,
		createChannelMap,
		updateDOMChannelMentions,
	]);

	useEffect(() => {
		if (channels && channels.length > 0) {
			setTimeout(() => {
				updateAllChannelMentions();
			}, 100);
		}
	}, [channels, updateAllChannelMentions]);

	useEffect(() => {
		if (
			channels?.length > 0 &&
			roles?.length > 0 &&
			value &&
			internalValue &&
			!initialValueProcessedRef.current
		) {
			const { updatedValue, hasChanges } = updateMentionsInValue(internalValue);
			if (hasChanges) {
				setInternalValue(updatedValue);
			}
			initialValueProcessedRef.current = true;
		}
	}, [channels, roles, value, internalValue, updateMentionsInValue]);

	const editorContainerRef = useRef<HTMLDivElement>(null);

	const renderElement = useCallback(
		(props: RenderElementProps) => <Element {...props} />,
		[],
	);
	const renderLeaf = useCallback(
		(props: CustomRenderLeafProps) => <Leaf {...props} />,
		[],
	);
	const editor = useMemo(
		() =>
			withMentions(withReact(withHistory(createEditor()))) as TestCustomEditor,
		[],
	);

	function escapeRegExp(string: string) {
		return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	const decorate = useCallback(([node, path]: NodeEntry) => {
		return [];
	}, []);

	const serializeToPlaintext = useCallback((nodes: Descendant[]): string => {
		return nodes
			.map((n) => {
				if (SlateElement.isElement(n)) {
					if (n.type === "mention" && "value" in n) {
						if (n.mentionType === "role") return `@${n.displayValue}`;
						if (n.mentionType === "channel") {
							return `<#${n.value}>`;
						}
						return `@${n.value}`;
					}
					if (
						n.type === "spoiler" &&
						n.children &&
						n.children[0] &&
						typeof n.children[0].text === "string"
					) {
						return `||${n.children[0].text}||`;
					}
				}
				if ("children" in n) {
					let paragraphText = "";
					for (const child of n.children) {
						if (SlateElement.isElement(child)) {
							if (
								child.type === "spoiler" &&
								child.children &&
								child.children[0] &&
								typeof child.children[0].text === "string"
							) {
								paragraphText += `||${child.children[0].text}||`;
								continue;
							}
							if (child.type === "mention" && "value" in child) {
								if (child.mentionType === "role") {
									paragraphText += `@${child.displayValue}`;
								} else if (child.mentionType === "channel") {
									paragraphText += `<#${child.value}>`;
								} else {
									paragraphText += `@${child.value}`;
								}
								continue;
							}
						}

						if (!("text" in child)) continue;

						const text = child.text || "";
						const textNode = child as CustomText;
						if (textNode.bold) paragraphText += `**${text}**`;
						else if (textNode.strikethrough) paragraphText += `~~${text}~~`;
						else if (textNode.underline) paragraphText += `__${text}__`;
						else paragraphText += text;
					}
					return paragraphText;
				}
				return "";
			})
			.join("\n");
	}, []);

	const handleSlateChange = useCallback(
		(newValue: Descendant[]) => {
			let valueToUse = newValue;
			if (channels.length > 0) {
				const channelMap = createChannelMap(channels);
				let hasUpdates = false;
				const updatedValue = newValue.map((node) => {
					if (SlateElement.isElement(node) && node.type === "paragraph") {
						const updatedChildren = node.children.map((child) => {
							if (
								SlateElement.isElement(child) &&
								child.type === "mention" &&
								child.mentionType === "channel"
							) {
								const { needsUpdate, newDisplayValue } =
									updateChannelDisplayValue(
										child.value,
										child.displayValue || child.value,
										channelMap,
									);
								if (needsUpdate) {
									hasUpdates = true;
									return {
										...child,
										displayValue: newDisplayValue,
										needsUpdate: false,
									};
								}
							}
							return child;
						});
						if (
							updatedChildren.some((child, i) => child !== node.children[i])
						) {
							return { ...node, children: updatedChildren };
						}
					}
					return node;
				});

				if (hasUpdates) {
					valueToUse = updatedValue;
				}
			}

			setInternalValue(valueToUse);

			if (onChange) {
				const serialized = serializeToPlaintext(valueToUse);
				setCharCount(serialized.length);
				onChange(serialized);
			}
		},
		[
			onChange,
			channels,
			createChannelMap,
			updateChannelDisplayValue,
			serializeToPlaintext,
		],
	);

	const filteredRoles = useMemo(() => {
		if (!mentionPopover || mentionPopover.type !== "role") return [];
		return roles.filter((role) =>
			role.name.toLowerCase().includes(mentionPopover.search.toLowerCase()),
		);
	}, [roles, mentionPopover]);

	const filteredChannels = useMemo(() => {
		if (!mentionPopover || mentionPopover.type !== "channel") return [];
		return channels.filter((channel) =>
			channel.name.toLowerCase().includes(mentionPopover.search.toLowerCase()),
		);
	}, [channels, mentionPopover]);

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

	const filteredVariables = useMemo(() => {
		if (!mentionPopover || mentionPopover.type !== "variable") return [];
		return variables.filter((variable) =>
			variable.name.toLowerCase().includes(mentionPopover.search.toLowerCase()),
		);
	}, [variables, mentionPopover]);

	const removeAllPlaceholders = useCallback(() => {
		try {
			Editor.normalize(editor, { force: true });
			ReactEditor.focus(editor);
			Transforms.removeNodes(editor, {
				match: (n) =>
					SlateElement.isElement(n) && n.type === "mention-placeholder",
			});
		} catch (err) {}
	}, [editor]);

	const closePopover = useCallback(() => {
		if (mentionPopover) {
			removeAllPlaceholders();
			setMentionPopover(null);
		}
	}, [mentionPopover, removeAllPlaceholders]);

	const getAnchorPosition = useCallback(() => {
		const selection = window.getSelection();
		if (!selection || !selection.rangeCount) return null;
		const range = selection.getRangeAt(0);
		const rect = range.getBoundingClientRect();
		return { x: rect.left, y: rect.bottom };
	}, []);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (disabled) return;
			if (maxLength && charCount >= maxLength) {
				const allowedKeys = [
					"ArrowLeft",
					"ArrowRight",
					"ArrowUp",
					"ArrowDown",
					"Backspace",
					"Delete",
					"Home",
					"End",
					"Tab",
					"Escape",
					"Shift",
					"Control",
					"Alt",
					"PageUp",
					"PageDown",
				];
				if (
					!allowedKeys.includes(event.key) &&
					!event.ctrlKey &&
					!event.metaKey
				) {
					event.preventDefault();
					return;
				}
			}
			if (event.key === "Escape" && mentionPopover) {
				event.preventDefault();
				try {
					ReactEditor.focus(editor);
					Transforms.insertText(editor, "@");
					Transforms.removeNodes(editor, {
						match: (n) =>
							SlateElement.isElement(n) && n.type === "mention-placeholder",
					});
				} catch (err) {}
				closePopover();
				return;
			}
			if (event.key === " ") {
				const { selection } = editor;
				if (!selection || !Range.isCollapsed(selection)) return;
				const [node, path] = Editor.node(editor, selection);
				if (
					Text.isText(node) &&
					(node.bold ||
						node.strikethrough ||
						node.underline ||
						(node as { spoiler?: boolean }).spoiler)
				) {
					event.preventDefault();
					Editor.withoutNormalizing(editor, () => {
						const point = selection.anchor;
						const offset = point.offset;
						if (offset === node.text.length) {
							Transforms.insertNodes(
								editor,
								{ text: " " },
								{ at: Editor.after(editor, path) || selection },
							);
							Transforms.move(editor);
						} else {
							const beforeText = node.text.slice(0, offset);
							const afterText = node.text.slice(offset);
							Transforms.removeNodes(editor, { at: path });
							const { text: _, ...formattingProps } = node;
							if (afterText) {
								Transforms.insertNodes(
									editor,
									{ text: afterText, ...formattingProps },
									{ at: path },
								);
							}
							Transforms.insertNodes(editor, { text: " " }, { at: path });
							if (beforeText) {
								Transforms.insertNodes(
									editor,
									{ text: beforeText, ...formattingProps },
									{ at: path },
								);
							}
							Transforms.select(editor, {
								path,
								offset: beforeText.length + 1,
							});
						}
					});
					return;
				}
			}
			if (["@", "#", "{"].includes(event.key)) {
				event.preventDefault();
				const domSel = window.getSelection();
				if (domSel && domSel.rangeCount > 0) {
					const anchor = getAnchorPosition();
					if (!anchor) return;
					let mentionType: MentionType = "variable";
					if (event.key === "@") mentionType = "role";
					if (event.key === "#") mentionType = "channel";
					const { selection } = editor;
					if (!selection) {
						ReactEditor.focus(editor);
						return;
					}
					Transforms.insertNodes(editor, {
						type: "mention-placeholder",
						mentionType,
						children: [{ text: "" }],
					});
					setMentionPopover({ type: mentionType, search: "", anchor });
				}
				return;
			}
		},
		[
			disabled,
			editor,
			getAnchorPosition,
			mentionPopover,
			closePopover,
			maxLength,
			charCount,
		],
	);

	const editorMinHeight = `${Math.max(rows * 24, 100)}px`;

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
				initialValue={internalValue}
				onChange={handleSlateChange}
			>
				<Editable
					renderElement={renderElement}
					renderLeaf={renderLeaf}
					decorate={decorate}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					className="focus:outline-none"
					style={{ minHeight: editorMinHeight }}
					readOnly={disabled}
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
				{!disabled && mentionPopover && (
					<Popover
						open={true}
						onOpenChange={(open) => {
							if (!open) closePopover();
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
										setMentionPopover({
											...mentionPopover,
											search: value,
										})
									}
									onKeyDown={(e) => {
										if (e.key === "Escape") {
											e.preventDefault();
											e.stopPropagation();
											closePopover();
											Transforms.insertText(
												editor,
												MENTION_TYPE_CONFIG[mentionPopover.type].icon,
											);
										}
										if (e.key === "Backspace") {
											e.preventDefault();
											e.stopPropagation();
											closePopover();
											Transforms.insertText(
												editor,
												MENTION_TYPE_CONFIG[mentionPopover.type].icon,
											);
										}
									}}
								/>
								<CommandList>
									<CommandEmpty>No results found.</CommandEmpty>
									{mentionPopover?.type === "role" && (
										<CommandGroup heading="Roles">
											{filteredRoles.map((role) => (
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
																insertMentionAtPlaceholder(editor, {
																	type: "mention",
																	mentionType: "role",
																	value: role.id,
																	displayValue: role.name,
																	children: [{ text: "" }],
																});
															} else {
																insertMentionAtPlaceholder(editor, {
																	type: "mention",
																	mentionType: "role",
																	value: role.id,
																	displayValue: role.name,
																	children: [{ text: "" }],
																});
															}
														} catch (err) {
															insertMentionAtPlaceholder(editor, {
																type: "mention",
																mentionType: "role",
																value: role.id,
																displayValue: role.name,
																children: [{ text: "" }],
															});
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
									{mentionPopover?.type === "channel" && (
										<CommandGroup heading="Channels">
											{filteredChannels.map((channel) => (
												<CommandItem
													key={channel.id}
													onSelect={() => {
														try {
															insertChannelMention(
																channel,
																editor,
																closePopover,
															);
														} catch (err) {
														} finally {
															closePopover();
														}
													}}
												>
													#{channel.name}
												</CommandItem>
											))}
										</CommandGroup>
									)}
									{mentionPopover?.type === "variable" && (
										<CommandGroup heading="Variables">
											{filteredVariables.map((variable) => (
												<CommandItem
													key={variable.id}
													onSelect={() => {
														try {
															insertMentionAtPlaceholder(editor, {
																type: "mention",
																mentionType: "variable",
																value: variable.name,
																displayValue: variable.name,
																children: [{ text: "" }],
															});
														} catch (err) {
														} finally {
															closePopover();
														}
													}}
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

/** ---------------------
 * WITH-MENTIONS EDITOR ENHANCEMENTS
 * --------------------- **/

const withMentions = (editor: TestCustomEditor) => {
	const { isInline, isVoid, normalizeNode, insertText } = editor;

	editor.insertText = (text) => {
		const { selection } = editor;
		if (text !== " " || !selection || !Range.isCollapsed(selection)) {
			insertText(text);
			return;
		}
		const [node] = Editor.node(editor, selection);
		if (!Text.isText(node)) {
			insertText(text);
			return;
		}
		const { anchor } = selection;
		const start = Editor.start(editor, anchor.path);
		const textBefore = Editor.string(editor, { anchor: start, focus: anchor });

		const patterns = [
			{
				pattern: /\*\*([^*]+)\*\*$/,
				formatProp: "bold" as const,
				markerLength: 2,
			},
			{
				pattern: /~~([^~]+)~~$/,
				formatProp: "strikethrough" as const,
				markerLength: 2,
			},
			{
				pattern: /__([^_]+)__$/,
				formatProp: "underline" as const,
				markerLength: 2,
			},
		];
		for (const { pattern, formatProp, markerLength } of patterns) {
			const match = pattern.exec(textBefore);
			if (match) {
				applyInlineFormat(
					editor,
					anchor.path,
					textBefore,
					match,
					formatProp,
					markerLength,
				);
				Transforms.insertText(editor, " ");
				return;
			}
		}

		const spoilerMatch = textBefore.match(/\|\|([^|]+)\|\|$/);
		if (spoilerMatch) {
			Transforms.delete(editor, {
				at: {
					anchor: {
						path: anchor.path,
						offset: anchor.offset - spoilerMatch[0].length,
					},
					focus: anchor,
				},
			});
			const spoilerElement: SpoilerElement = {
				type: "spoiler",
				children: [{ text: spoilerMatch[1] }],
			};
			Transforms.insertNodes(editor, spoilerElement);
			Transforms.insertText(editor, " ");
			return;
		}

		insertText(text);
	};

	editor.isInline = (element: SlateElement) =>
		element.type === "mention" ||
		element.type === "mention-placeholder" ||
		element.type === "spoiler"
			? true
			: isInline(element);

	editor.isVoid = (element: SlateElement) =>
		element.type === "mention" ||
		element.type === "mention-placeholder" ||
		element.type === "spoiler"
			? true
			: isVoid(element);

	editor.markableVoid = (element: SlateElement) =>
		element.type === "mention" ||
		element.type === "mention-placeholder" ||
		element.type === "spoiler";

	editor.normalizeNode = (entry) => {
		const [node, path] = entry;
		normalizeNode(entry);
		if (!Text.isText(node)) return;
		if (node.text === "") return;

		const text = node.text;
		const spoilerPattern = /\|\|([^|]+?)\|\|/;
		const spoilerMatch = spoilerPattern.exec(text);
		if (spoilerMatch) {
			const parentEntry = Editor.parent(editor, path);
			const [parentNode] = parentEntry;
			if (SlateElement.isElement(parentNode) && editor.isVoid(parentNode))
				return;

			const start = spoilerMatch.index;
			const end = start + spoilerMatch[0].length;
			const spoilerContent = spoilerMatch[1];
			const beforeText = text.slice(0, start);
			const afterText = text.slice(end);
			let currentOffset: number | null = null;
			if (editor.selection && Path.equals(editor.selection.anchor.path, path)) {
				currentOffset = editor.selection.anchor.offset;
			}
			const wasFocused = ReactEditor.isFocused(editor);
			const parentPath = Path.parent(path);
			const index = path[path.length - 1];
			Editor.withoutNormalizing(editor, () => {
				Transforms.removeNodes(editor, { at: path });
				const newNodes: SlateNode[] = [];
				if (beforeText) newNodes.push({ text: beforeText });
				newNodes.push({
					type: "spoiler",
					children: [{ text: spoilerContent }],
				} as SpoilerElement);
				if (afterText) newNodes.push({ text: afterText });
				Transforms.insertNodes(editor, newNodes, {
					at: parentPath.concat(index),
				});
				if (currentOffset !== null) {
					let newPath: number[];
					let newOffset: number;
					if (currentOffset <= beforeText.length) {
						newPath = parentPath.concat(index);
						newOffset = currentOffset;
					} else if (
						currentOffset <=
						beforeText.length + spoilerMatch[0].length
					) {
						const afterSpoilerIndex = beforeText ? index + 1 : index;
						newPath = parentPath.concat(afterSpoilerIndex + 1);
						newOffset = 0;
					} else {
						const afterTextIndex = beforeText ? index + 2 : index + 1;
						newPath = parentPath.concat(afterTextIndex);
						newOffset =
							currentOffset - (beforeText.length + spoilerMatch[0].length);
					}
					try {
						const [nodeAtPath] = Editor.node(editor, newPath);
						if (Text.isText(nodeAtPath)) {
							Transforms.select(editor, { path: newPath, offset: newOffset });
						} else {
							const after = Editor.after(editor, newPath);
							if (after) Transforms.select(editor, after);
						}
					} catch (e) {
						const end = Editor.end(editor, []);
						Transforms.select(editor, end);
					}
				}
				if (wasFocused) ReactEditor.focus(editor);
			});
			return;
		}

		const boldPattern = /\*\*([^*]+?)\*\*/;
		const boldMatch = boldPattern.exec(text);
		if (boldMatch && !node.bold) {
			applyInlineFormat(editor, path, text, boldMatch, "bold", 2);
			return;
		}

		const strikePattern = /~~([^~]+?)~~/;
		const strikeMatch = strikePattern.exec(text);
		if (strikeMatch && !node.strikethrough) {
			applyInlineFormat(editor, path, text, strikeMatch, "strikethrough", 2);
			return;
		}

		const underlinePattern = /__([^_]+?)__/;
		const underlineMatch = underlinePattern.exec(text);
		if (underlineMatch && !node.underline) {
			applyInlineFormat(editor, path, text, underlineMatch, "underline", 2);
			return;
		}
	};

	return editor;
};

// Function to insert a channel mention.
const insertChannelMention = (
	channel: RawChannel,
	editor: TestCustomEditor,
	closePopoverFn: () => void,
) => {
	try {
		if (!channel.id || !channel.name) return;
		ReactEditor.focus(editor);
		Transforms.removeNodes(editor, {
			match: (n) =>
				SlateElement.isElement(n) && n.type === "mention-placeholder",
		});
		Transforms.insertNodes(editor, {
			type: "mention",
			mentionType: "channel",
			value: channel.id,
			displayValue: channel.name,
			children: [{ text: "" }],
		} as StarWarsMentionElement);
		const { selection } = editor;
		if (selection) {
			const point = Editor.after(editor, selection);
			if (point) Transforms.select(editor, point);
		}
		closePopoverFn();
	} catch (err) {}
};

const Leaf = ({ attributes, children, leaf }: CustomRenderLeafProps) => {
	if (leaf.bold) children = <strong>{children}</strong>;
	if (leaf.code)
		children = (
			<code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
				{children}
			</code>
		);
	if (leaf.italic) children = <em>{children}</em>;
	if (leaf.underline) children = <u>{children}</u>;
	if (leaf.strikethrough) children = <s>{children}</s>;
	if (leaf.spoiler)
		children = (
			<span className="bg-gray-800 text-transparent hover:text-white cursor-pointer">
				{children}
			</span>
		);
	if (leaf.title)
		return (
			<span {...attributes} className="inline-block font-bold text-lg my-2">
				{children}
			</span>
		);
	if (leaf.list)
		return (
			<span {...attributes} className="text-blue-600">
				{children}
			</span>
		);
	if (leaf.hr)
		return (
			<span
				{...attributes}
				className="block text-center border-b-2 border-gray-300"
			>
				{children}
			</span>
		);
	if (leaf.blockquote)
		return (
			<span
				{...attributes}
				className="inline-block border-l-2 border-gray-300 pl-2 text-gray-500 italic"
			>
				{children}
			</span>
		);
	if (leaf.url)
		return (
			<span {...attributes} className="text-blue-500 underline">
				{children}
			</span>
		);
	if (leaf.keyword)
		return (
			<span {...attributes} className="text-purple-600 font-bold">
				{children}
			</span>
		);
	if (leaf.punctuation)
		return (
			<span {...attributes} className="text-gray-500">
				{children}
			</span>
		);
	return <span {...attributes}>{children}</span>;
};

const MENTION_TYPE_CONFIG: Record<
	MentionType,
	{
		icon: string;
		style: string;
		prefix: string;
	}
> = {
	role: {
		icon: "@",
		style: "bg-blue-100 text-blue-800 border-blue-300",
		prefix: "@",
	},
	channel: {
		icon: "#",
		style: "bg-green-100 text-green-800 border-green-300",
		prefix: "#",
	},
	variable: {
		icon: "{",
		style: "bg-amber-100 text-amber-800 border-amber-300",
		prefix: "",
	},
};

const Element = (props: RenderElementProps) => {
	const { attributes, children, element } = props;
	switch (element.type) {
		case "mention":
			return (
				<Mention
					{...(props as RenderElementPropsFor<StarWarsMentionElement>)}
				/>
			);
		case "spoiler":
			return <Spoiler {...(props as RenderElementPropsFor<SpoilerElement>)} />;
		case "mention-placeholder":
			return (
				<span
					{...attributes}
					contentEditable={false}
					className={cn(
						"inline-block px-1.5 py-0.5 m-0.5 rounded-md text-sm font-medium border",
						MENTION_TYPE_CONFIG[element.mentionType].style,
					)}
					data-slate-void="true"
				>
					<span style={{ display: "none" }}>{children}</span>
					{MENTION_TYPE_CONFIG[element.mentionType].icon}
				</span>
			);
		default:
			return <p {...attributes}>{children}</p>;
	}
};

const Mention = ({
	attributes,
	children,
	element,
}: RenderElementPropsFor<StarWarsMentionElement>) => {
	const selected = useSelected();
	const focused = useFocused();
	let displayContent: string;
	if (element.mentionType === "channel") {
		displayContent = `#${element.displayValue || element.value}`;
	} else if (element.mentionType === "role") {
		displayContent = `@${element.displayValue}`;
	} else {
		displayContent = element.displayValue;
	}
	return (
		<span
			{...attributes}
			contentEditable={false}
			data-cy={`mention-${element.value.replace(" ", "-")}`}
			data-mention-type={element.mentionType}
			data-value={element.value}
			data-display={element.displayValue}
			className={cn(
				"inline-block px-1.5 py-0.5 m-0.5 rounded-md text-sm font-medium border",
				MENTION_TYPE_CONFIG[element.mentionType].style,
				selected && focused ? "ring-2 ring-blue-300" : "",
			)}
			data-slate-void="true"
			aria-atomic="true"
			role="button"
		>
			<span style={{ display: "none" }}>{children}</span>
			{displayContent}
		</span>
	);
};

const Spoiler = ({
	attributes,
	children,
	element,
}: RenderElementPropsFor<SpoilerElement>) => {
	const selected = useSelected();
	const focused = useFocused();
	const textContent = element.children?.[0]?.text || "";
	return (
		<>
			<span className="text-slate-500 mr-0.5">||</span>
			<span
				{...attributes}
				data-slate-void="true"
				className={cn(
					"inline-block px-1.5 py-0.5 rounded-md text-sm relative",
					"bg-slate-300/50 text-slate-700 transition-colors",
					selected && focused ? "ring-2 ring-blue-300" : "",
				)}
				contentEditable={false}
			>
				<span contentEditable={false}>{textContent}</span>
				{children}
			</span>
			<span className="text-slate-500 ml-0.5">||</span>
		</>
	);
};

export { TestMentionTextarea };

import { useFormContext } from "react-hook-form";
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
} from "@/components/ui/form";

interface TestMentionFieldProps {
	name: string;
	label?: string;
	description?: string;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	rows?: number;
	maxLength?: number;
	id?: string;
}

export function TestMentionField({
	name,
	label,
	description,
	placeholder = "Type '@' to mention someone...",
	disabled = false,
	className,
	rows = 3,
	maxLength,
	id,
}: TestMentionFieldProps) {
	const form = useFormContext();
	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem>
					{label && <FormLabel>{label}</FormLabel>}
					<FormControl>
						<TestMentionTextarea
							name={name}
							value={field.value}
							onChange={field.onChange}
							placeholder={placeholder}
							disabled={disabled || field.disabled}
							className={className}
							rows={rows}
							maxLength={maxLength}
							id={id}
						/>
					</FormControl>
					{description && <FormDescription>{description}</FormDescription>}
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
