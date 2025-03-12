"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getUser } from "@/hooks/use-user";
import avatarUrl from "@/lib/is-gif";
import type { GuildData } from "@/types/guild";
import { MentionRenderer } from "@/components/ui/mention";
import type { ExtendedGuildData, Channel } from "@/components/ui/mention";
import { cn } from "@/lib/utils";
import { CheckIcon, ImageIcon } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
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
	const dimensions = size === "small" ? "size-20" : "w-full h-[300px]";

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
	// Sprawdź, czy URL jest prawidłowy
	const isValidUrl = (urlString: string): boolean => {
		try {
			// Sprawdź, czy URL jest nieprawidłowy
			if (!urlString) {
				return false;
			}

			// Sprawdź, czy URL zawiera zmienne
			if (urlString.includes("{") || urlString.includes("}")) {
				return false;
			}

			// Sprawdź, czy URL zaczyna się od http lub https
			if (
				!urlString.startsWith("http://") &&
				!urlString.startsWith("https://")
			) {
				return false;
			}

			// Spróbuj utworzyć obiekt URL, aby sprawdzić, czy URL jest prawidłowy
			new URL(urlString);
			return true;
		} catch (e) {
			console.error("Invalid URL:", urlString, e);
			return false;
		}
	};

	// Jeśli URL jest nieprawidłowy lub pusty, pokaż placeholder
	if (!url || !isValidUrl(url)) {
		console.log("Using placeholder for invalid URL:", url);
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
	const lastValueRef = useRef<Discord.APIEmbed | null>(null);

	// Track when embed/userData/guildData last changed to help force refreshes
	const lastDataRef = useRef<{
		embedId: string;
		userData: Discord.User | null;
		guildId: string;
		channels: Array<Channel>;
		roles: Array<{ id: string; name: string }>;
	}>({
		embedId: "",
		userData: null,
		guildId: "",
		channels: [],
		roles: [],
	});

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

	// Helper function to format text with variables
	const formatTextVariables = (text: string): string => {
		console.log("[formatTextVariables] input:", text);

		if (!text) return "";

		// Funkcja do usuwania znaczników HTML
		const stripHtmlTags = (html: string): string => {
			// Jeśli tekst zawiera znaczniki HTML, usuń je
			if (html.includes("<") && html.includes(">")) {
				// Tymczasowy element do parsowania HTML
				const temp = document.createElement("div");
				temp.innerHTML = html;
				return temp.textContent || "";
			}
			return html;
		};

		// Sprawdź, czy tekst zawiera proste znaczniki HTML
		const hasSimpleHtml =
			text.includes("<p>") ||
			text.includes("</p>") ||
			text.includes("<div>") ||
			text.includes("</div>") ||
			text.includes("<br>") ||
			text.includes("<br/>") ||
			text.includes("<span>") ||
			text.includes("</span>");

		// Sprawdź, czy tekst zawiera zaawansowane formatowanie
		const hasAdvancedFormatting =
			text.includes('data-mention-type="variable"') ||
			text.includes("data-slate-node") ||
			text.includes("mention") ||
			text.includes("<strong>") ||
			text.includes("<em>") ||
			text.includes("<u>") ||
			text.includes("<del>") ||
			text.includes("<code>");

		// Jeśli mamy proste HTML bez zaawansowanego formatowania, usuń znaczniki
		let processableText = text;
		if (hasSimpleHtml && !hasAdvancedFormatting) {
			processableText = stripHtmlTags(text);
			console.log(
				"[formatTextVariables] Stripped HTML tags from:",
				text,
				"to:",
				processableText,
			);
		}

		// Handle the special <id:customize> format for the Roles & Channels option
		let processedText = processableText.replace(/<id:customize>/g, (match) => {
			console.log("[formatTextVariables] Processing customize mention");
			const span = `<span class="mention customize-mention" data-mention-type="channel" data-mention-value="customize">Roles & Channels</span>`;
			console.log(
				"[formatTextVariables] Created customize mention span:",
				span,
			);
			return span;
		});

		// Next handle Discord-style mentions: <#channelId>, <@userId>, <@&roleId>
		processedText = processedText.replace(
			/<(#|@|@&)(\d+)>/g,
			(match, type, id) => {
				console.log("[formatTextVariables] Processing Discord-style mention:", {
					type,
					id,
				});

				let mentionType = "unknown";
				let displayText = id;

				switch (type) {
					case "#": {
						// Channel mention
						mentionType = "channel";
						// Always use the latest channels data
						const channel = channels.find((c) => c.id === id);
						displayText = channel?.name || id;
						console.log("[formatTextVariables] Channel mention:", {
							id,
							name: displayText,
						});
						break;
					}
					case "@": {
						// User mention
						mentionType = "user";
						break;
					}
					case "@&": {
						// Role mention
						mentionType = "role";
						// Always use the latest roles data
						const role = roles.find((r) => r.id === id);
						displayText = role?.name || id;
						break;
					}
				}

				// Create appropriate mention span
				const span = `<span class="mention" data-mention-type="${mentionType}" data-mention-value="${id}">${type === "#" ? "#" : "@"}${displayText}</span>`;
				console.log(
					"[formatTextVariables] Created Discord-style mention span:",
					span,
				);
				return span;
			},
		);

		// Now handle variable replacements as before
		processedText = processedText.replace(
			/\{([^{}]+)\}/g,
			(match, variable) => {
				console.log("[formatTextVariables] Processing variable:", variable);

				// Always get fresh values from latest state
				let value = "";

				switch (variable) {
					case "server_name": {
						value = guildData?.name || "Server";
						console.log(
							"[formatTextVariables] server_name value:",
							value,
							"guildData:",
							guildData?.name,
						);
						break;
					}
					case "server_id": {
						value = guildData?.id || "Unknown";
						console.log("[formatTextVariables] server_id value:", value);
						break;
					}
					case "member_count": {
						value =
							guildData?.guild_details?.approximate_member_count?.toString() ||
							"0";
						console.log("[formatTextVariables] member_count value:", value);
						break;
					}
					case "user":
					case "user.username": {
						value = userData?.username || "user";
						console.log(
							"[formatTextVariables] user variable. userData:",
							userData,
							"value:",
							value,
						);
						break;
					}
					default: {
						value = variable;
						console.log(
							"[formatTextVariables] default variable:",
							variable,
							"value:",
							value,
						);
						break;
					}
				}

				// Ensure we have a properly formatted mention span with correct attributes
				const span = `<span class="mention" data-mention-type="variable" data-mention-value="${variable}">${value}</span>`;
				console.log("[formatTextVariables] Created mention span:", span);
				return span;
			},
		);

		console.log("[formatTextVariables] result:", processedText);
		return processedText;
	};

	// Function to process variables and mentions in text
	const processVariables = useCallback(
		(text: string, isTitle = false): string => {
			if (!text) return "";

			console.log("[processVariables] input:", text, "isTitle:", isTitle);

			// Funkcja do usuwania znaczników HTML
			const stripHtmlTags = (html: string): string => {
				// Jeśli tekst zawiera znaczniki HTML, usuń je
				if (html.includes("<") && html.includes(">")) {
					// Tymczasowy element do parsowania HTML
					const temp = document.createElement("div");
					temp.innerHTML = html;
					return temp.textContent || "";
				}
				return html;
			};

			// Sprawdź, czy tekst zawiera proste znaczniki HTML
			const hasSimpleHtml =
				text.includes("<p>") ||
				text.includes("</p>") ||
				text.includes("<div>") ||
				text.includes("</div>") ||
				text.includes("<br>") ||
				text.includes("<br/>") ||
				text.includes("<span>") ||
				text.includes("</span>");

			// Sprawdź, czy tekst zawiera zaawansowane formatowanie
			const hasAdvancedFormatting =
				text.includes('data-mention-type="variable"') ||
				text.includes("data-slate-node") ||
				text.includes("mention") ||
				text.includes("<strong>") ||
				text.includes("<em>") ||
				text.includes("<u>") ||
				text.includes("<del>") ||
				text.includes("<code>");

			// Jeśli mamy proste HTML bez zaawansowanego formatowania, usuń znaczniki
			let processableText = text;
			if (hasSimpleHtml && !hasAdvancedFormatting) {
				processableText = stripHtmlTags(text);
				console.log(
					"[processVariables] Stripped HTML tags from:",
					text,
					"to:",
					processableText,
				);
			}

			// First, handle direct variable replacements for display in the preview
			const processedText = processableText.replace(
				/\{([^{}]+)\}/g,
				(match, variable) => {
					console.log("[processVariables] Processing variable:", variable);

					// Always get fresh values from latest state
					let value = "";

					switch (variable) {
						case "server_name": {
							value = guildData?.name || "Server";
							console.log(
								"[processVariables] server_name value:",
								value,
								"guildData:",
								guildData?.name,
							);
							break;
						}
						case "server_id": {
							value = guildData?.id || "Unknown";
							console.log("[processVariables] server_id value:", value);
							break;
						}
						case "member_count": {
							value =
								guildData?.guild_details?.approximate_member_count?.toString() ||
								"0";
							console.log("[processVariables] member_count value:", value);
							break;
						}
						case "user":
						case "user.username": {
							value = userData?.username || "user";
							console.log(
								"[processVariables] user variable. userData:",
								userData,
								"value:",
								value,
							);
							break;
						}
						default: {
							value = match;
							console.log(
								"[processVariables] default variable:",
								variable,
								"value:",
								value,
							);
							break;
						}
					}

					if (isTitle) {
						return value;
					}

					// For non-title text, wrap in a formatted span
					return `<span data-slate-node="element" data-slate-inline="true" data-slate-void="true" contenteditable="false" class="rounded-md px-1.5 py-0.5 text-sm select-all border cursor-default font-medium bg-amber-100 text-amber-800 border-amber-300" data-mention-type="variable" data-mention-value="${variable}">${value}</span>`;
				},
			);

			console.log(
				"[processVariables] after variable replacement:",
				processedText,
			);

			return processedText;
		},
		[userData, guildData],
	);

	// Helper function to format text with spans and markdown-like syntax
	const formatText = (text: string) => {
		if (!text) return text;

		// Funkcja do usuwania znaczników HTML
		const stripHtmlTags = (html: string): string => {
			// Jeśli tekst zawiera znaczniki HTML, usuń je
			if (html.includes("<") && html.includes(">")) {
				// Tymczasowy element do parsowania HTML
				const temp = document.createElement("div");
				temp.innerHTML = html;
				return temp.textContent || "";
			}
			return html;
		};

		// Sprawdź, czy tekst zawiera proste znaczniki HTML
		const hasSimpleHtml =
			text.includes("<p>") ||
			text.includes("</p>") ||
			text.includes("<div>") ||
			text.includes("</div>") ||
			text.includes("<br>") ||
			text.includes("<br/>") ||
			text.includes("<span>") ||
			text.includes("</span>");

		// Sprawdź, czy tekst zawiera zaawansowane formatowanie
		const hasAdvancedFormatting =
			text.includes('data-mention-type="variable"') ||
			text.includes("data-slate-node") ||
			text.includes("mention") ||
			text.includes("<strong>") ||
			text.includes("<em>") ||
			text.includes("<u>") ||
			text.includes("<del>") ||
			text.includes("<code>");

		// Jeśli mamy proste HTML bez zaawansowanego formatowania, usuń znaczniki
		const textWithoutHtml =
			hasSimpleHtml && !hasAdvancedFormatting ? stripHtmlTags(text) : text;

		type TextSegment = {
			text: string;
			isFormatted: boolean;
			format?: (text: string) => ReactElement;
		};

		// Start with the text as a single segment
		let segments: TextSegment[] = [
			{ text: textWithoutHtml, isFormatted: false },
		];

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

	// Helper function to parse HTML content for title
	const parseTitleContent = (content: string): ReactElement[] => {
		if (!content) return [];

		console.log("parseTitleContent input:", content);

		// Funkcja do usuwania znaczników HTML
		const stripHtmlTags = (html: string): string => {
			// Jeśli tekst zawiera znaczniki HTML, usuń je
			if (html.includes("<") && html.includes(">")) {
				// Tymczasowy element do parsowania HTML
				const temp = document.createElement("div");
				temp.innerHTML = html;
				return temp.textContent || "";
			}
			return html;
		};

		// Check if content contains variable mentions in span format
		if (
			content.includes('data-type="mention"') ||
			content.includes('data-mention-type="variable"')
		) {
			try {
				// Configure DOMPurify for variable processing
				const config = {
					ALLOWED_TAGS: ["span", "div", "p", "br"],
					ALLOWED_ATTR: [
						"class",
						"data-type",
						"data-value",
						"data-mention-type",
						"data-mention-value",
						"contenteditable",
					],
					ADD_ATTR: ["data-mention-type", "data-value", "data-mention-value"],
					ALLOW_DATA_ATTR: true,
					RETURN_DOM: true,
					RETURN_DOM_FRAGMENT: true,
				};

				// Use DOMPurify to sanitize and create a DOM fragment
				const fragment = DOMPurify.sanitize(
					content,
					config,
				) as unknown as DocumentFragment;

				// Process text nodes and variable mentions
				const processNode = (node: Node): string => {
					if (node.nodeType === Node.TEXT_NODE) {
						return node.textContent || "";
					}

					if (node.nodeType === Node.ELEMENT_NODE) {
						const element = node as HTMLElement;

						// Handle variable mentions
						if (
							element.tagName === "SPAN" &&
							(element.getAttribute("data-type") === "mention" ||
								element.getAttribute("data-mention-type") === "variable")
						) {
							const variableName =
								element.getAttribute("data-value") ||
								element.getAttribute("data-mention-value");

							if (variableName) {
								switch (variableName) {
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
									case "user.username":
										return userData?.username || "user";
									default:
										return variableName;
								}
							}
						}

						// Process child nodes
						return Array.from(element.childNodes)
							.map((child) => processNode(child))
							.join("");
					}

					return "";
				};

				// Process the entire fragment
				const processedText = Array.from(fragment.childNodes)
					.map((node) => processNode(node))
					.join("")
					.trim();

				console.log("Final processed title text:", processedText);
				return [<span key="title-content">{processedText}</span>];
			} catch (error) {
				console.error("Error processing title with variables:", error);
				return [<span key="title-content">{stripHtmlTags(content)}</span>];
			}
		}

		// If no variable mentions, just process with normal variables
		const processedContent = processVariables(content, true);
		return [<span key="title-content">{processedContent}</span>];
	};

	// Process DOM nodes to extract mentions and format text
	const processNodes = (
		parentNode: Element | DocumentFragment,
	): ReactElement[] => {
		const elements: ReactElement[] = [];
		const uniqueId = Math.random().toString(36).substring(2, 9);

		// Process each child node
		for (let i = 0; i < parentNode.childNodes.length; i++) {
			const node = parentNode.childNodes[i];

			if (node.nodeType === Node.TEXT_NODE) {
				// Handle text nodes
				const text = node.textContent || "";
				if (text.trim()) {
					// Apply basic formatting to text nodes
					const formattedText = formatText(text);
					if (Array.isArray(formattedText)) {
						elements.push(...formattedText);
					} else {
						elements.push(
							<Fragment key={`text-${i}-${uniqueId}`}>{text}</Fragment>,
						);
					}
				}
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				const element = node as HTMLElement;

				// Handle mention spans from the new MentionTextarea format
				if (
					element.tagName === "SPAN" &&
					(element.getAttribute("data-type") === "mention" ||
						element.hasAttribute("data-mention-type") ||
						element.classList.contains("mention"))
				) {
					// Extract mention type and value from the element
					let mentionType =
						element.getAttribute("data-mention-type") ||
						element.getAttribute("data-type") ||
						"variable";

					// Check for data-mention-value first, then fall back to data-value
					let value =
						element.getAttribute("data-mention-value") ||
						element.getAttribute("data-value") ||
						"";

					// Log what we found for debugging
					console.log("Processing mention element:", {
						mentionType,
						value,
						hasDataMentionValue: element.hasAttribute("data-mention-value"),
						hasDataValue: element.hasAttribute("data-value"),
						elementContent: element.textContent,
						classList: Array.from(element.classList),
					});

					// Handle the customize case
					if (
						element.classList.contains("customize-mention") ||
						mentionType === "customize" ||
						value === "customize"
					) {
						mentionType = "channel";
						value = "customize";
						const mentionElement = renderMention(mentionType, value);
						if (mentionElement) {
							elements.push(mentionElement);
							continue;
						}
					}

					// Create the appropriate mention element
					const mentionElement = renderMention(mentionType, value);
					if (mentionElement) {
						elements.push(mentionElement);
					} else {
						// Fallback if we couldn't render the mention
						elements.push(
							<span
								key={`unknown-mention-${i}-${uniqueId}`}
								className="text-[#5865F2] bg-[#5865F21A] rounded px-1 mention"
							>
								{element.textContent || value}
							</span>,
						);
					}
				} else if (element.tagName === "P" || element.tagName === "DIV") {
					// Process paragraph or div elements
					const childElements = processNodes(element);
					if (childElements.length > 0) {
						elements.push(
							<Fragment key={`block-${i}-${uniqueId}`}>
								{childElements}
								{element.tagName === "P" && <br />}
							</Fragment>,
						);
					}
				} else if (element.tagName === "BR") {
					// Handle line breaks
					elements.push(<br key={`br-${i}-${uniqueId}`} />);
				} else if (element.tagName === "STRONG" || element.tagName === "B") {
					// Handle bold text
					const childElements = processNodes(element);
					elements.push(
						<strong key={`bold-${i}-${uniqueId}`}>
							{childElements.length > 0
								? childElements
								: element.textContent || ""}
						</strong>,
					);
				} else if (element.tagName === "EM" || element.tagName === "I") {
					// Handle italic text
					const childElements = processNodes(element);
					elements.push(
						<em key={`italic-${i}-${uniqueId}`}>
							{childElements.length > 0
								? childElements
								: element.textContent || ""}
						</em>,
					);
				} else if (element.tagName === "U") {
					// Handle underlined text
					const childElements = processNodes(element);
					elements.push(
						<u key={`underline-${i}-${uniqueId}`}>
							{childElements.length > 0
								? childElements
								: element.textContent || ""}
						</u>,
					);
				} else if (element.tagName === "DEL" || element.tagName === "S") {
					// Handle strikethrough text
					const childElements = processNodes(element);
					elements.push(
						<del key={`strikethrough-${i}-${uniqueId}`}>
							{childElements.length > 0
								? childElements
								: element.textContent || ""}
						</del>,
					);
				} else if (element.tagName === "CODE") {
					// Handle code text
					const childElements = processNodes(element);
					elements.push(
						<code
							key={`code-${i}-${uniqueId}`}
							className="bg-muted px-1 py-0.5 rounded"
						>
							{childElements.length > 0
								? childElements
								: element.textContent || ""}
						</code>,
					);
				} else {
					// Process any other elements recursively
					const childElements = processNodes(element);
					if (childElements.length > 0) {
						elements.push(
							<Fragment key={`other-${i}-${uniqueId}`}>
								{childElements}
							</Fragment>,
						);
					}
				}
			}
		}

		return elements;
	};

	// Helper function to render a mention based on type and ID
	const renderMention = (type: string, id: string): ReactElement | null => {
		console.log(
			"renderMention called with type:",
			type,
			"id:",
			id || "<empty string>",
		);

		// Skip rendering if type or id is empty
		if (!type || !id) {
			console.log("Skipping mention rendering due to empty type or id");
			return null;
		}

		if (type === "channel") {
			// Special case for "customize" which is the Roles & Channels option
			if (id === "customize") {
				console.log("Rendering customize mention");
				return (
					<span
						key="channel-customize"
						className="text-[#5865F2] bg-[#5865F21A] rounded px-1 mention customize-mention"
						data-mention-type="channel"
						data-mention-value="customize"
					>
						Roles & Channels
					</span>
				);
			}

			const channel = channels.find((c) => c.id === id);
			console.log("Rendering channel mention, found channel:", channel?.name);
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

		if (type === "variable") {
			// Handle variable mentions
			let displayText = id;

			// Handle special variables
			switch (id) {
				case "user.username":
				case "user":
					displayText = userData?.username || "user";
					console.log("Variable user/user.username, userData:", userData);
					break;
				case "server_name":
					displayText = guildData?.name || "Server";
					console.log("Variable server_name, guildData:", guildData?.name);
					break;
				case "server_id":
					displayText = guildData?.id || "Unknown";
					break;
				case "member_count":
					displayText =
						guildData?.guild_details?.approximate_member_count?.toString() ||
						"0";
					break;
			}

			console.log(
				"Rendering variable mention:",
				id,
				"with display text:",
				displayText,
			);

			return (
				<span
					key={`variable-${id}`}
					className="text-[#5865F2] bg-[#5865F21A] rounded px-1 mention"
					data-mention-type="variable"
					data-mention-value={id}
					data-value={displayText}
				>
					{displayText}
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

	useEffect(() => {
		if (!embed) return;

		const hasEmbedChanged = embed !== lastValueRef.current;
		const hasUserDataChanged = userData !== lastDataRef.current.userData;
		const hasGuildDataChanged = guildData?.id !== lastDataRef.current.guildId;
		const hasChannelsChanged = channels !== lastDataRef.current.channels;
		const hasRolesChanged = roles !== lastDataRef.current.roles;

		// Update our tracking refs
		lastValueRef.current = embed;
		lastDataRef.current = {
			embedId: embed?.title || "", // Just using title as a simple identifier
			userData,
			guildId: guildData?.id || "",
			channels,
			roles,
		};

		// Process embed values when present
		console.log("Processing embed values, original embed:", embed);
		console.log("Current userData:", userData, "guildData:", guildData?.name);
		console.log("Changes detected:", {
			hasEmbedChanged,
			hasUserDataChanged,
			hasGuildDataChanged,
			hasChannelsChanged,
			hasRolesChanged,
		});

		try {
			// Process embed values with variables
			console.log("Processing embed in useEffect. Original embed:", embed);

			const processedData = {
				...embed,
				title: embed.title ? processVariables(embed.title, true) : undefined,
				description: embed.description
					? processVariables(embed.description)
					: undefined,
				fields: embed.fields
					? embed.fields.map((field) => ({
							name: field.name ? processVariables(field.name) : field.name,
							value: field.value ? processVariables(field.value) : field.value,
							inline: field.inline,
						}))
					: [],
				footer: embed.footer
					? {
							text: processVariables(embed.footer.text),
						}
					: undefined,
			};

			console.log("Processed embed data:", processedData);

			// Force refresh by creating a new object reference
			setProcessedEmbed({ ...processedData });
		} catch (error) {
			console.error("Error processing embed:", error);
		}
	}, [embed, userData, guildData, channels, roles, processVariables]);
	/* eslint-enable react-hooks/exhaustive-deps */

	// Helper function to parse text with mentions and formatting
	const parseWithGuildData = (
		content: string,
		asFragment = false,
	): ReactElement[] | string => {
		try {
			// Funkcja do usuwania znaczników HTML
			const stripHtmlTags = (html: string): string => {
				// Jeśli tekst zawiera znaczniki HTML, usuń je
				if (html.includes("<") && html.includes(">")) {
					// Tymczasowy element do parsowania HTML
					const temp = document.createElement("div");
					temp.innerHTML = html;
					return temp.textContent || "";
				}
				return html;
			};

			// Sprawdź, czy content zawiera proste znaczniki HTML
			const hasSimpleHtml =
				content.includes("<p>") ||
				content.includes("</p>") ||
				content.includes("<div>") ||
				content.includes("</div>") ||
				content.includes("<br>") ||
				content.includes("<br/>") ||
				content.includes("<span>") ||
				content.includes("</span>");

			// Sprawdź, czy content zawiera zaawansowane formatowanie
			const hasAdvancedFormatting =
				content.includes('data-mention-type="variable"') ||
				content.includes("data-slate-node") ||
				content.includes("mention") ||
				content.includes("<strong>") ||
				content.includes("<em>") ||
				content.includes("<u>") ||
				content.includes("<del>") ||
				content.includes("<code>");

			// Jeśli mamy proste HTML bez zaawansowanego formatowania, usuń znaczniki
			let processableContent = content;
			if (hasSimpleHtml && !hasAdvancedFormatting) {
				processableContent = stripHtmlTags(content);
				console.log(
					"Stripped HTML tags from content:",
					content,
					"to:",
					processableContent,
				);
			}

			// Napraw potencjalnie uszkodzone tagi span
			const fixedContent = processableContent;

			// Always apply variable replacements for content to ensure variables are formatted
			// This ensures that {server_name}, {user}, etc. are always replaced with their values
			const processedContent = formatTextVariables(fixedContent);

			// Define strings to check for
			const mentionTypeStr = 'data-type="mention"';
			const mentionAttrStr = "data-mention-type";
			const mentionClassStr = "mention";
			const customizeClassStr = "customize-mention";
			const formattingTags = ["<strong>", "<em>", "<u>", "<del>", "<code>"];

			// Check if the content contains HTML that needs to be processed
			const containsHtml =
				processedContent.indexOf(mentionTypeStr) !== -1 ||
				processedContent.indexOf(mentionAttrStr) !== -1 ||
				processedContent.indexOf(mentionClassStr) !== -1 ||
				processedContent.indexOf(customizeClassStr) !== -1 ||
				formattingTags.some((tag) => processedContent.indexOf(tag) !== -1);

			if (containsHtml) {
				// Create a temporary DOM element to parse the HTML content
				const temp = document.createElement("div");
				// Sanitize and set innerHTML
				temp.innerHTML = DOMPurify.sanitize(processedContent, {
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
						"code",
						"del",
						"img",
					],
					ALLOWED_ATTR: [
						"class",
						"data-type",
						"data-value",
						"data-mention-type",
						"contenteditable",
						"src",
						"alt",
						"style",
					],
					ADD_ATTR: ["data-mention-type", "data-value"],
					ALLOW_DATA_ATTR: true,
				});

				// Process the nodes to convert mention spans to React elements
				const elements = processNodes(temp);

				// Return the elements as a fragment if requested
				return asFragment && elements.length > 0
					? [<Fragment key="mention-fragment">{elements}</Fragment>]
					: elements;
			}

			// If no HTML was found, process as plain text
			const formattedText = formatText(processedContent);

			// If we need a fragment and the result is a string, wrap it
			if (asFragment && typeof formattedText === "string") {
				return [<Fragment key="text-fragment">{formattedText}</Fragment>];
			}

			return formattedText;
		} catch (error) {
			console.error("Error parsing content with guild data:", error);
			// Fallback to basic text rendering
			return formatText(content);
		}
	};

	// Helper function to resolve image URL variables
	const resolveImageUrl = (url: string): string | undefined => {
		if (!url) return undefined;

		console.log("Resolving image URL:", url);

		// Handle special variables
		if (url.startsWith("{") && url.endsWith("}")) {
			const variable = url.slice(1, -1);
			console.log("Handling image variable:", variable);
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

	if (!processedEmbed) return null;

	// Calculate color for embed display
	const color = processedEmbed?.color
		? `#${processedEmbed.color.toString(16).padStart(6, "0")}`
		: "#1e40af";

	// Calculate grid columns based on inline fields
	const gridCols = processedEmbed?.fields?.some((field) => field.inline)
		? "grid-cols-2"
		: "grid-cols-1";

	// Get bot's avatar URL
	const botAvatarUrl =
		userData?.id && userData.avatar
			? avatarUrl(userData.id, userData.avatar, 128, true)
			: undefined;

	// Process image URLs - używamy resolveImageUrl do przetworzenia URL-i
	const thumbnailUrl = processedEmbed?.thumbnail?.url
		? resolveImageUrl(processedEmbed.thumbnail.url)
		: undefined;
	const imageUrl = processedEmbed?.image?.url
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
							{userData?.username?.slice(0, 2).toUpperCase()}
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
