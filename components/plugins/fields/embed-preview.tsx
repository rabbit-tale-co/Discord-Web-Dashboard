"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getUser } from "@/hooks/use-user";
import avatarUrl from "@/lib/is-gif";
import type { GuildData } from "@/types/guild";
import { MentionRenderer } from "@/components/ui/mention";
import type { ExtendedGuildData, Channel } from "@/components/ui/mention";
import { cn } from "@/lib/utils";
import { CheckIcon, ImageIcon } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import type * as Discord from "discord.js";
import Image from "next/image";
import type { ReactElement, ReactNode } from "react";
import * as React from "react";
import { Fragment } from "react";
import { getCachedData } from "@/lib/cache";
import DOMPurify from "dompurify";

/**
 * Interface for embed preview component props
 */
interface EmbedPreviewProps {
	embed: {
		color?: number;
		title?: string;
		description?: string;
		fields?: Array<{
			name: string;
			value: string;
			inline?: boolean;
		}>;
		footer?: {
			text: string;
		};
		thumbnail?: {
			url: string;
		};
		image?: {
			url: string;
		};
	} | null;
	guildData: GuildData;
}

// Patterns for text formatting
const TEXT_FORMATS = [
	{
		pattern: /\*\*([\s\S]+?)\*\*/g,
		renderer: (text: string) => <strong key={text}>{text}</strong>,
	},
	{
		pattern: /\*([\s\S]+?)\*/g,
		renderer: (text: string) => <em key={text}>{text}</em>,
	},
	{
		pattern: /__([\s\S]+?)__/g,
		renderer: (text: string) => <u key={text}>{text}</u>,
	},
	{
		pattern: /~~([\s\S]+?)~~/g,
		renderer: (text: string) => <del key={text}>{text}</del>,
	},
	{
		pattern: /`([\s\S]+?)`/g,
		renderer: (text: string) => (
			<code key={text} className="bg-gray-100 px-1 rounded font-mono">
				{text}
			</code>
		),
	},
	// Code blocks with language support (```language\ncode```)
	{
		pattern: /```(\w*)\n?([\s\S]+?)```/g,
		renderer: (text: string) => {
			// This pattern captures two groups: language and code content
			const matches = /^(\w*)\n?([\s\S]+)$/.exec(text);

			if (!matches) return <code key={text}>{text}</code>;

			const [, language, code] = matches;
			const langClass = language ? `language-${language}` : "";

			return (
				<pre
					key={code}
					className="bg-gray-100 p-2 rounded font-mono text-sm overflow-x-auto my-2 w-full"
				>
					<code className={langClass}>{code}</code>
				</pre>
			);
		},
	},
];

/**
 * Component for rendering image placeholders
 */
function ImagePlaceholder({ size = "large" }: { size?: "small" | "large" }) {
	const dimensions = size === "small" ? "size-20" : "h-[300px] w-[400px]";

	const iconSize = size === "small" ? "size-8" : "h-12 w-12";

	return (
		<div
			className={`flex ${dimensions} items-center justify-center rounded-md border-2 border-dashed border-[#E3E5E8] bg-[#FFFFFF]`}
		>
			<ImageIcon className={`${iconSize} text-[#E3E5E8]`} />
		</div>
	);
}

/**
 * Component for rendering embeds with proper image fallbacks
 */
function EmbedImage({
	url,
	alt,
	size = "large",
}: { url?: string; alt: string; size?: "small" | "large" }) {
	if (!url) {
		return <ImagePlaceholder size={size} />;
	}

	const width = size === "small" ? 80 : 400;
	const height = size === "small" ? 80 : 300;
	const className =
		size === "small"
			? "size-20 rounded-md object-cover"
			: "max-h-[300px] w-auto rounded-md object-cover";

	return (
		<Image
			src={url}
			alt={alt}
			width={width}
			height={height}
			className={className}
		/>
	);
}

/**
 * Component to preview Discord embeds with mentions support
 */
export function EmbedPreview({ embed, guildData }: EmbedPreviewProps) {
	const [userData, setUserData] = useState<Discord.User | null>(null);
	const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
	const [channels, setChannels] = useState<Array<Channel>>([]);
	const [processedEmbed, setProcessedEmbed] =
		useState<EmbedPreviewProps["embed"]>(embed);

	// Add ref for the editor container
	const editorRef = useRef<HTMLDivElement>(null);

	// Add ref to track if component is mounted
	const isMounted = useRef(true);

	// Store the last value to prevent loss during tab switching
	const lastValueRef = useRef(embed);

	// Track the initial mount to avoid unnecessary resets
	const initialMountRef = useRef(true);

	useEffect(() => {
		// Set mounted flag
		isMounted.current = true;
		initialMountRef.current = true;

		// Cleanup function
		return () => {
			isMounted.current = false;
		};
	}, []);

	/** Load guild data from cache on mount */
	useEffect(() => {
		try {
			const cacheKey = `guild-${guildData.id}`;
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
	}, [guildData.id]);

	useEffect(() => {
		const fetchUser = async () => {
			const botId = process.env.NEXT_PUBLIC_BOT_ID;
			if (!botId) {
				return;
			}
			const response = await getUser(botId);
			if (response) {
				const user = response as unknown as Discord.User;
				setUserData(user);
			}
		};
		fetchUser();
	}, []);

	// Process embed content when component mounts or data changes
	useEffect(() => {
		if (!embed || !userData) return;

		try {
			const processedData = {
				...embed,
				title: embed.title ? formatTextVariables(embed.title, true) : undefined,
				description: embed.description
					? formatTextVariables(embed.description)
					: undefined,
				fields: embed.fields
					?.map((field) => ({
						name: field.name ? formatTextVariables(field.name) : field.name,
						value: field.value ? formatTextVariables(field.value) : field.value,
						inline: field.inline,
					}))
					.filter(
						(field): field is NonNullable<typeof field> =>
							field.name !== undefined && field.value !== undefined,
					),
				footer: embed.footer
					? {
							text: formatTextVariables(embed.footer.text),
						}
					: undefined,
			};

			setProcessedEmbed(processedData);
		} catch (error) {
			console.error("Error processing embed content:", error);
			setProcessedEmbed(embed);
		}
	}, [embed, userData]);

	if (!processedEmbed || !userData) return null;

	// Helper function to format text with spans and markdown-like syntax
	const formatText = (text: string) => {
		if (!text) return text;

		type TextSegment = {
			text: string;
			isFormatted: boolean;
			format?: (text: string) => ReactElement;
		};

		// Start with the text as a single segment
		let segments: TextSegment[] = [{ text, isFormatted: false }];

		// Apply each formatting pattern
		for (const { pattern, renderer } of TEXT_FORMATS) {
			const newSegments: TextSegment[] = [];

			for (const segment of segments) {
				// Skip already formatted segments
				if (segment.isFormatted) {
					newSegments.push(segment);
					continue;
				}

				// Split the text by the pattern
				let lastIndex = 0;
				// Create a new regex instance to ensure lastIndex is reset
				const regex = new RegExp(pattern.source, "g");
				const matches = Array.from(segment.text.matchAll(regex));

				if (matches.length === 0) {
					newSegments.push(segment);
					continue;
				}

				for (const match of matches) {
					const [fullMatch, innerText] = match;
					const startIndex = match.index || 0;

					// Skip matches with escaped characters (e.g., \*\*text\*\*)
					if (startIndex > 0 && segment.text[startIndex - 1] === "\\") {
						// Add text before the match including the backslash
						if (startIndex > lastIndex) {
							newSegments.push({
								text: segment.text.substring(lastIndex, startIndex - 1),
								isFormatted: false,
							});
						}

						// Add the matched text without formatting (remove the escape character)
						newSegments.push({
							text: fullMatch,
							isFormatted: false,
						});

						lastIndex = startIndex + fullMatch.length;
						continue;
					}

					// Add text before the match
					if (startIndex > lastIndex) {
						newSegments.push({
							text: segment.text.substring(lastIndex, startIndex),
							isFormatted: false,
						});
					}

					// Add the formatted text
					newSegments.push({
						text: innerText,
						isFormatted: true,
						format: renderer,
					});

					lastIndex = startIndex + fullMatch.length;
				}

				// Add remaining text
				if (lastIndex < segment.text.length) {
					newSegments.push({
						text: segment.text.substring(lastIndex),
						isFormatted: false,
					});
				}
			}

			segments = newSegments;
		}

		// Render the segments
		return segments.map((segment, index) => {
			if (segment.isFormatted && segment.format) {
				return segment.format(segment.text);
			}
			return <Fragment key={`text-${segment.text}`}>{segment.text}</Fragment>;
		});
	};

	// Helper functions for timestamp formatting
	const formatRelative = (date: Date): string => {
		const now = new Date();
		const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diff < 60) return "just now";
		if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
		if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
		return `${Math.floor(diff / 2592000)} months ago`;
	};

	const formatDate = (date: Date): string => {
		return date.toLocaleDateString();
	};

	const formatTime = (date: Date): string => {
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	};

	const formatFull = (date: Date): string => {
		return date.toLocaleString();
	};

	// Helper function to format text variables
	const formatTextVariables = (text: string, isTitle = false): string => {
		if (!text) return "";

		// For title, only do basic variable replacements without formatting
		if (isTitle) {
			return text.replace(/{(.*?)}/g, (match, variable) => {
				switch (variable) {
					case "server_name":
						return guildData?.name || "Server";
					case "server_id":
						return guildData?.id || "Unknown";
					case "member_count":
						return (
							guildData?.guild_details?.approximate_member_count?.toString() ||
							"0"
						);
					case "user":
						return userData?.username || "user";
					default:
						return match;
				}
			});
		}

		// For non-title text, process with full mention formatting
		const formattedText = text
			// Handle user mentions <@123456789>
			.replace(/<@!?(\d+)>/g, (match, id) => {
				const username = id === userData?.id ? userData.username : "user";
				return `<span data-type="user" data-value="${id}" class="mention">@${username}</span>`;
			})
			// Handle role mentions <@&123456789>
			.replace(/<@&(\d+)>/g, (match, id) => {
				const role = roles.find((r) => r.id === id);
				return `<span data-type="role" data-value="${id}" class="mention">@${role?.name || "role"}</span>`;
			})
			// Handle channel mentions <#123456789>
			.replace(/<#(\d+)>/g, (match, id) => {
				const channel = channels.find((c) => c.id === id);
				return `<span data-type="channel" data-value="${id}" class="mention">#${channel?.name || "channel"}</span>`;
			})
			// Handle custom emojis <:name:123456789>
			.replace(/<:([^:]+):(\d+)>/g, (match, name, id) => {
				return `<img src="https://cdn.discordapp.com/emojis/${id}.png" alt=":${name}:" class="emoji" />`;
			})
			// Handle animated emojis <a:name:123456789>
			.replace(/<a:([^:]+):(\d+)>/g, (match, name, id) => {
				return `<img src="https://cdn.discordapp.com/emojis/${id}.gif" alt=":${name}:" class="emoji" />`;
			})
			// Handle id:customize
			.replace(/id:customize/g, () => {
				return `<span data-type="customize" class="mention customize-mention">Roles & Channels</span>`;
			})
			// Handle timestamp <t:1234567890:R>
			.replace(/<t:(\d+)(?::([RFTDR]))?\>/g, (match, timestamp, format) => {
				const date = new Date(Number.parseInt(timestamp, 10) * 1000);
				let formattedTime: string;
				switch (format) {
					case "R":
						formattedTime = formatRelative(date);
						break;
					case "T":
						formattedTime = formatTime(date);
						break;
					case "D":
						formattedTime = formatDate(date);
						break;
					case "F":
						formattedTime = formatFull(date);
						break;
					default:
						formattedTime = date.toLocaleString();
				}
				return `<span class="timestamp">${formattedTime}</span>`;
			});

		// Then handle curly brace variables
		return formattedText.replace(/{(.*?)}/g, (match, variable) => {
			switch (variable) {
				case "server_name":
					return `<span data-type="server" data-value="${guildData?.id || ""}" class="mention">${guildData?.name || "Server"}</span>`;
				case "server_id":
					return guildData?.id || "Unknown";
				case "member_count":
					return (
						guildData?.guild_details?.approximate_member_count?.toString() ||
						"0"
					);
				case "user":
					return userData ? `<@${userData.id}>` : "user";
				default:
					return match;
			}
		});
	};

	// Helper function to parse HTML content for title
	const parseTitleContent = (content: string): ReactElement[] => {
		const temp = document.createElement("div");
		// Sanitize the HTML content before parsing
		temp.innerHTML = DOMPurify.sanitize(content, {
			ALLOWED_TAGS: ["span", "div", "p", "br", "b", "i", "u", "strong", "em"],
			ALLOWED_ATTR: ["class", "data-type", "data-value", "contenteditable"],
		});

		const processNode = (node: Node, key: string): ReactElement => {
			if (node.nodeType === Node.TEXT_NODE) {
				// Always wrap text nodes in a React fragment
				return <Fragment key={key}>{node.textContent || ""}</Fragment>;
			}

			if (node.nodeType === Node.ELEMENT_NODE) {
				const element = node as Element;
				const children = Array.from(element.childNodes).map((child, index) =>
					processNode(child, `${key}-${index}`),
				);

				// Handle special elements like mentions
				if (
					element.tagName === "SPAN" &&
					element.getAttribute("data-type") === "mention"
				) {
					return (
						<span
							key={key}
							className="text-[#5865F2] bg-[#5865F21A] rounded px-1"
							data-type={element.getAttribute("data-type")}
							data-value={element.getAttribute("data-value")}
						>
							{element.textContent}
						</span>
					);
				}

				// Create React element based on tag name
				const props: Record<string, string | undefined> = {
					key,
					className: element.className || undefined,
				};

				// Add any additional attributes that are needed
				if (element.hasAttributes()) {
					for (const attr of Array.from(element.attributes)) {
						if (attr.name !== "class") {
							// class is handled above
							props[attr.name] = attr.value;
						}
					}
				}

				return React.createElement(
					element.tagName.toLowerCase(),
					props,
					...children,
				);
			}

			// Default case: return empty fragment
			return <Fragment key={key} />;
		};

		// Generate unique keys for root nodes
		const uniquePrefix = Math.random().toString(36).substring(2, 9);
		return Array.from(temp.childNodes).map((node, index) =>
			processNode(node, `title-${uniquePrefix}-${index}`),
		);
	};

	// Helper function to process DOM nodes and convert mentions to React elements
	const processNodes = (
		parentNode: Element | DocumentFragment,
	): ReactElement[] => {
		const elements: ReactElement[] = [];
		const textContent: string[] = [];

		for (const node of Array.from(parentNode.childNodes)) {
			if (node.nodeType === Node.TEXT_NODE) {
				// Add text nodes directly
				if (node.textContent) {
					textContent.push(node.textContent);
				}
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				// Process element nodes
				const element = node as Element;

				// If there's accumulated text, process it first
				if (textContent.length > 0) {
					const processedTextElements = processTextContent(
						textContent.join(""),
					);
					elements.push(...processedTextElements);
					textContent.length = 0; // Clear the array
				}

				if (
					element.tagName === "SPAN" &&
					(element.classList.contains("mention") ||
						element.hasAttribute("data-type") ||
						element.getAttribute("contenteditable") === "false")
				) {
					// Apply styling for mentions regardless of specific attributes
					// This will catch all Discord-style mentions
					elements.push(
						<span
							key={`styled-mention-${elements.length}`}
							className="text-[#5865F2] bg-[#5865F21A] rounded px-1 mention"
						>
							{element.textContent}
						</span>,
					);
				} else {
					// Handle other elements recursively
					const childElements = processNodes(element);
					elements.push(...childElements);
				}
			}
		}

		// Process any remaining text
		if (textContent.length > 0) {
			const processedTextElements = processTextContent(textContent.join(""));
			elements.push(...processedTextElements);
		}

		return elements;
	};

	// Helper function to process text content and extract mentions
	const processTextContent = (
		text: string,
		asFragment = false,
	): ReactElement[] => {
		// Create a unique identifier for this instance of processTextContent
		const uniqueId = Math.random().toString(36).substring(2, 9);

		const elements: ReactElement[] = [];
		// Sanitize the input text
		const sanitizedText = DOMPurify.sanitize(text, {
			ALLOWED_TAGS: [], // Only allow text content
			ALLOWED_ATTR: [],
		});
		const remainingText = sanitizedText;

		// Special handling for user mentions with emojis
		// Match patterns like @Tiny Rabbit 🐇
		const specialUserRegex = /@([^<>]+)/g;
		const specialUserMatches = Array.from(
			sanitizedText.matchAll(specialUserRegex),
		);

		if (specialUserMatches.length > 0) {
			let lastIndex = 0;

			// Process text with special user mentions
			for (const match of specialUserMatches) {
				const fullMatch = match[0];
				const position = match.index;

				// Add text before this mention
				if (position > lastIndex) {
					const textBefore = text.substring(lastIndex, position);
					elements.push(
						<Fragment key={`text-before-user-${lastIndex}-${uniqueId}`}>
							{textBefore}
						</Fragment>,
					);
				}

				// Add the special user mention with styling
				elements.push(
					<span
						key={`user-emoji-${position}-${uniqueId}`}
						className="text-[#5865F2] bg-[#5865F21A] rounded px-1 mention"
					>
						{fullMatch}
					</span>,
				);

				// Update last index
				lastIndex = position + fullMatch.length;
			}

			// Add remaining text after last mention
			if (lastIndex < text.length) {
				const textAfter = text.substring(lastIndex);
				elements.push(
					<Fragment key={`text-after-user-${lastIndex}-${uniqueId}`}>
						{textAfter}
					</Fragment>,
				);
			}

			return asFragment && elements.length > 0
				? [<Fragment key={`mention-fragment-${uniqueId}`}>{elements}</Fragment>]
				: elements;
		}

		// Special handling for channel mentions with emojis
		// Match patterns like #1️⃣ · faq or #🔑 · support-ticket
		const specialChannelRegex = /#([^<>\s]+)\s*·\s*([^<>\s]+)/g;
		const specialMatches = Array.from(text.matchAll(specialChannelRegex));

		if (specialMatches.length > 0) {
			let lastIndex = 0;

			// Process text with special mentions
			for (const match of specialMatches) {
				const fullMatch = match[0];
				const position = match.index;

				// Add text before this mention
				if (position > lastIndex) {
					const textBefore = text.substring(lastIndex, position);
					elements.push(
						<Fragment key={`text-before-${lastIndex}`}>{textBefore}</Fragment>,
					);
				}

				// Add the special channel mention with styling
				elements.push(
					<span
						key={`channel-emoji-${position}`}
						className="text-[#5865F2] bg-[#5865F21A] rounded px-1 mention"
					>
						{fullMatch}
					</span>,
				);

				// Update last index
				lastIndex = position + fullMatch.length;
			}

			// Add remaining text after last mention
			if (lastIndex < text.length) {
				const textAfter = text.substring(lastIndex);
				elements.push(
					<Fragment key={`text-after-${lastIndex}`}>{textAfter}</Fragment>,
				);
			}

			return asFragment && elements.length > 0
				? [<Fragment key="mention-fragment">{elements}</Fragment>]
				: elements;
		}

		// Process Discord-style mentions if special ones weren't found
		// Match Discord-style mentions like <@123456789>, <#123456789>, etc.
		// Also match HTML entity encoded forms like &lt;@123456789&gt;, &lt;#123456789&gt;
		const mentionRegex = /(?:<|&lt;)([@#])!?&?(\d+)(?:>|&gt;)/g;
		const mentions: { type: string; id: string; position: number }[] = [];

		// Use a do-while loop to avoid assignment in expression
		let match: RegExpExecArray | null = mentionRegex.exec(text);
		while (match !== null) {
			mentions.push({
				type: match[1] === "@" ? "user" : "channel",
				id: match[2],
				position: match.index,
			});
			match = mentionRegex.exec(text);
		}

		// Process mentions
		if (mentions.length > 0) {
			let lastIndex = 0;

			// Sort mentions by position
			mentions.sort((a, b) => a.position - b.position);

			// Process text with mentions
			for (const mention of mentions) {
				// Add text before this mention
				if (mention.position > lastIndex) {
					const textBefore = text.substring(lastIndex, mention.position);
					elements.push(
						<Fragment key={`text-${lastIndex}`}>{textBefore}</Fragment>,
					);
				}

				// Add the mention
				const mentionElement = renderMention(mention.type, mention.id);
				if (mentionElement) {
					elements.push(mentionElement);
				}

				// Update last index - account for both HTML entity encoded and regular forms
				const mentionText = text.substring(mention.position).startsWith("&lt;")
					? mention.type === "user"
						? `&lt;@${mention.id}&gt;`
						: `&lt;#${mention.id}&gt;`
					: mention.type === "user"
						? `<@${mention.id}>`
						: `<#${mention.id}>`;

				lastIndex = mention.position + mentionText.length;
			}

			// Add remaining text after last mention
			if (lastIndex < text.length) {
				const textAfter = text.substring(lastIndex);
				elements.push(
					<Fragment key={`text-end-${lastIndex}`}>{textAfter}</Fragment>,
				);
			}

			// Return the elements as a fragment if requested
			return asFragment && elements.length > 0
				? [<Fragment key="mention-fragment">{elements}</Fragment>]
				: elements;
		}

		// No mentions found, just add the text
		elements.push(
			<Fragment key={`text-only-${Math.random().toString(36).substring(2, 9)}`}>
				{text}
			</Fragment>,
		);

		return asFragment && elements.length > 0
			? [
					<Fragment
						key={`mention-fragment-${Math.random().toString(36).substring(2, 9)}`}
					>
						{elements}
					</Fragment>,
				]
			: elements;
	};

	// Helper function to render a mention based on type and ID
	const renderMention = (type: string, id: string): ReactElement | null => {
		if (type === "channel") {
			const channel = channels.find((c) => c.id === id);
			return (
				<span
					key={`channel-${id}`}
					className="text-[#5865F2] bg-[#5865F21A] rounded px-1 mention"
					data-mention-type="channel"
					data-mention-value={id}
				>
					#{channel?.name || id}
				</span>
			);
		}

		if (type === "user" || type === "mention") {
			// Handle user mentions
			return (
				<span
					key={`user-${id}`}
					className="text-[#5865F2] bg-[#5865F21A] rounded px-1 mention"
					data-mention-type="user"
					data-mention-value={id}
				>
					@{userData?.username || "user"}
				</span>
			);
		}

		if (type === "server" || (guildData?.id && guildData.id === id)) {
			// Handle server mentions
			return (
				<span
					key={`server-${id}`}
					className="text-[#5865F2] bg-[#5865F21A] rounded px-1 mention"
					data-mention-type="server"
					data-mention-value={id}
				>
					{guildData?.name || "server_name"}
				</span>
			);
		}

		return null;
	};

	// Helper function to parse text with mentions and formatting
	const parseWithGuildData = (
		content: string,
		asFragment = false,
	): ReactElement[] | string => {
		try {
			// Check if the content already contains properly styled mentions
			if (content.includes('contenteditable="false"')) {
				// Create a temporary DOM element to parse the HTML content
				const temp = document.createElement("div");
				// Sanitize and set innerHTML
				temp.innerHTML = DOMPurify.sanitize(content, {
					ALLOWED_TAGS: [
						"span",
						"div",
						"p",
						"br",
						"b",
						"i",
						"u",
						"strong",
						"em",
					],
					ALLOWED_ATTR: [
						"class",
						"data-type",
						"data-value",
						"contenteditable",
						"data-mention-type",
					],
				});

				// Process the nodes to convert mention spans to React elements
				const elements = processNodes(temp);

				// Return the elements as a fragment if requested
				return asFragment && elements.length > 0
					? [<Fragment key="mention-fragment">{elements}</Fragment>]
					: elements;
			}

			// First apply variable replacements for content without mentions
			const processedContent = formatTextVariables(content);

			// Create a temporary DOM element to parse the HTML content
			const temp = document.createElement("div");
			// Sanitize and set innerHTML
			temp.innerHTML = DOMPurify.sanitize(processedContent, {
				ALLOWED_TAGS: ["span", "div", "p", "br", "b", "i", "u", "strong", "em"],
				ALLOWED_ATTR: [
					"class",
					"data-type",
					"data-value",
					"contenteditable",
					"data-mention-type",
				],
			});

			// Check if there are any mention spans
			const hasMentionSpans = temp.querySelector("span.mention") !== null;

			if (hasMentionSpans) {
				// Process the nodes to convert mention spans to React elements
				const elements = processNodes(temp);

				// Return the elements as a fragment if requested
				return asFragment && elements.length > 0
					? [<Fragment key="mention-fragment">{elements}</Fragment>]
					: elements;
			}

			// If no mention spans were found, process as plain text
			return processTextContent(processedContent, asFragment);
		} catch (error) {
			console.error("Error parsing content with guild data:", error);
			// Fallback to basic text rendering
			return formatText(content);
		}
	};

	// Helper function to resolve image URL variables
	const resolveImageUrl = (url: string): string | undefined => {
		if (!url) return undefined;

		// Handle special variables
		if (url.startsWith("{") && url.endsWith("}")) {
			const variable = url.slice(1, -1);
			switch (variable) {
				case "server_image": {
					if (!guildData?.guild_details?.icon) {
						return undefined;
					}
					return avatarUrl(
						guildData.id,
						guildData.guild_details.icon,
						1024,
						false,
					);
				}
				case "server_banner": {
					if (!guildData?.guild_details?.banner) {
						return undefined;
					}
					return avatarUrl(
						guildData.id,
						guildData.guild_details.banner,
						1024,
						false,
					);
				}
				case "avatar": {
					if (!userData?.id || !userData?.avatar) {
						return undefined;
					}
					return avatarUrl(userData.id, userData.avatar, 1024, true);
				}
				default:
					return undefined;
			}
		}

		// Handle direct URLs
		if (url.startsWith("http")) {
			return url;
		}

		// Handle avatar hash
		if (url.match(/^[a-f0-9]+$/i) && userData?.id) {
			return avatarUrl(userData.id, url, 1024, true);
		}

		return undefined;
	};

	// Calculate color for embed display
	const color = processedEmbed.color
		? `#${processedEmbed.color.toString(16).padStart(6, "0")}`
		: "#1e40af";

	// Calculate grid columns based on inline fields
	const gridCols = processedEmbed.fields?.some((field) => field.inline)
		? "grid-cols-2"
		: "grid-cols-1";

	// Get bot's avatar URL
	const botAvatarUrl = avatarUrl(userData.id, userData.avatar, 128, true);

	// Process image URLs
	const thumbnailUrl = processedEmbed.thumbnail?.url
		? resolveImageUrl(processedEmbed.thumbnail.url)
		: undefined;
	const imageUrl = processedEmbed.image?.url
		? resolveImageUrl(processedEmbed.image.url)
		: undefined;

	return (
		<div className="flex flex-col gap-2 rounded-lg bg-[#FFFFFF] p-4 text-[#313338]">
			{/* Message container with avatar and content */}
			<div className="flex gap-4">
				{/* Avatar */}
				<div className="flex-shrink-0">
					<Avatar className="size-10 rounded-full">
						<AvatarImage
							src={botAvatarUrl}
							onError={(e) => {
								e.currentTarget.style.display = "none";
							}}
						/>
						<AvatarFallback>
							{userData.username.slice(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
				</div>

				{/* Message content */}
				<div className="flex flex-col flex-1">
					{/* Username and bot tag */}
					<div className="flex items-center gap-1 mb-1">
						<span className="font-medium text-[#060607]">
							{userData?.displayName || userData?.username || "Bot"}
						</span>
						<span className="rounded bg-[#5865F2] flex items-center gap-1 px-[0.275rem] py-[0.15rem] text-[0.625rem] font-medium leading-[0.875rem] text-white">
							<CheckIcon className="size-3" />
							APP
						</span>
					</div>

					{/* Embed container */}
					<div className="relative flex flex-col rounded-tr-sm rounded-br-sm bg-[#F2F3F5] text-[#2E3338]">
						<div className="flex gap-4 p-4">
							{/* Left border color indicator */}
							<div
								className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
								style={{ backgroundColor: color }}
							/>

							{/* Main content */}
							<div className="flex-1 pl-3">
								<div className="flex gap-4">
									{/* Title and description container */}
									<div className="flex-1">
										{/* Title */}
										{processedEmbed.title && (
											<div className="mb-2">
												<h3 className="font-semibold text-[#060607]">
													{parseTitleContent(processedEmbed.title)}
												</h3>
											</div>
										)}

										{/* Description */}
										{processedEmbed.description && (
											<div className="mb-3 text-sm leading-[1.375rem]">
												{parseWithGuildData(processedEmbed.description)}
											</div>
										)}

										{/* Fields */}
										{processedEmbed.fields &&
											processedEmbed.fields.length > 0 && (
												<div
													className={cn(
														"mb-3 grid gap-4",
														gridCols,
														"[&>*:last-child]:col-span-full",
													)}
												>
													{processedEmbed.fields.map((field, index) => (
														<div
															key={`field-${field.name || ""}-${index}`}
															className={cn(
																"min-w-[100px]",
																field.inline ? "" : "col-span-full",
															)}
														>
															{field.name && (
																<h4 className="mb-1 text-xs font-semibold text-[#060607]">
																	{parseWithGuildData(field.name)}
																</h4>
															)}
															{field.value && (
																<div className="text-sm leading-[1.375rem]">
																	{parseWithGuildData(field.value)}
																</div>
															)}
														</div>
													))}
												</div>
											)}

										{/* Main Image */}
										<div className="flex-shrink-0 mb-3">
											<EmbedImage url={imageUrl} alt="Embed Image" />
										</div>

										{/* Footer */}
										{processedEmbed.footer?.text && (
											<div className="mt-2 flex items-center gap-2 text-xs text-[#949BA4]">
												{parseWithGuildData(processedEmbed.footer.text)}
											</div>
										)}
									</div>

									{/* Right side content: Thumbnail */}
									{processedEmbed.thumbnail?.url && (
										<div className="flex-shrink-0">
											<EmbedImage
												url={thumbnailUrl}
												alt="Thumbnail"
												size="small"
											/>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
