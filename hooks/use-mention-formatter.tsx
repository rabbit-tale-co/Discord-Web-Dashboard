import * as React from "react";
import type { ReactNode } from "react";
import type { GuildData } from "@/types/guild";

/**
 * Interface representing data for a mention
 */
export interface MentionData {
	id: string;
	username?: string;
	avatar: string | null;
	displayName?: string;
	discriminator?: string;
	users?: Array<{ id: string; username: string }>;
	guildData?: GuildData;
	mentionTypes?: string[];
}

/**
 * Mention component props
 */
export interface MentionBaseProps
	extends React.HTMLAttributes<HTMLSpanElement> {
	children: React.ReactNode;
}

/**
 * Default mention component used for rendering mentions
 */
export const Mention = ({ children, ...props }: MentionBaseProps) => (
	<span
		className="text-[#5865F2] bg-[#5865F21A] rounded px-1 mention"
		{...props}
	>
		{children}
	</span>
);

/**
 * Mention formatter hook that provides functions for working with mentions
 */
export function useMentionFormatter() {
	/**
	 * Parse text content and convert mentions to React components
	 */
	const parseText = React.useCallback(
		(inputText: string, data: MentionData): ReactNode => {
			if (!inputText) return "";

			let mentionCounter = 0;
			const pieces: ReactNode[] = [];

			// Helper function to parse HTML using DOM
			const parseHTML = (htmlString: string) => {
				if (typeof DOMParser !== "undefined") {
					// Replace common HTML entities to ensure proper parsing
					const preparedHtml = htmlString
						.replace(/&lt;/g, "<")
						.replace(/&gt;/g, ">");

					// Create a full HTML document to ensure proper parsing
					const parser = new DOMParser();
					return parser.parseFromString(
						`<div>${preparedHtml}</div>`,
						"text/html",
					);
				}
				return null;
			};

			// Utility function to find user by name
			const findUserByName = (
				name: string,
			): { id: string; displayName: string } => {
				const username = name.trim();

				// First check if this is the main user
				if (
					data.displayName?.toLowerCase() === username.toLowerCase() ||
					data.username?.toLowerCase() === username.toLowerCase()
				) {
					return {
						id: data.id,
						displayName: data.displayName || data.username || username,
					};
				}

				// Then look through other users
				if (data.users) {
					const user = data.users.find(
						(u) =>
							u.username.toLowerCase() === username.toLowerCase() ||
							u.username.toLowerCase().includes(username.toLowerCase()),
					);
					if (user) {
						return {
							id: user.id,
							displayName: user.username,
						};
					}
				}

				return { id: "", displayName: username };
			};

			// Utility function to find channel by name
			const findChannelByName = (
				name: string,
			): { id: string; name: string } => {
				const channelName = name.trim();

				if (data.guildData?.channels) {
					const channel = data.guildData.channels.find(
						(c) =>
							c.name.toLowerCase() === channelName.toLowerCase() ||
							c.name.toLowerCase().includes(channelName.toLowerCase()) ||
							`#${c.name}`.toLowerCase() === channelName.toLowerCase(),
					);
					if (channel) {
						return {
							id: channel.id,
							name: channel.name,
						};
					}
				}

				return { id: "", name: channelName };
			};

			// Utility function to find role by name
			const findRoleByName = (name: string): { id: string; name: string } => {
				const roleName = name.trim();

				if (data.guildData?.roles) {
					const role = data.guildData.roles.find(
						(r) =>
							r.name.toLowerCase() === roleName.toLowerCase() ||
							r.name.toLowerCase().includes(roleName.toLowerCase()),
					);
					if (role) {
						return {
							id: role.id,
							name: role.name,
						};
					}
				}

				return { id: "", name: roleName };
			};

			// Step 1: Parse the HTML
			const doc = parseHTML(inputText);
			if (!doc) return inputText; // Fallback if DOMParser is not available

			const rootElement = doc.body.firstChild as HTMLElement;
			if (!rootElement) return inputText;

			// Step 2: Process all span elements that look like mentions
			const processMentionSpans = () => {
				// Find all span elements
				const spans = rootElement.querySelectorAll("span");

				for (const span of Array.from(spans)) {
					// Skip if it's already a proper mention
					if (
						span.classList.contains("mention") &&
						(span.getAttribute("data-id") || span.getAttribute("data-type"))
					) {
						continue;
					}

					const text = span.textContent || "";

					// Process @username mentions
					if (text.startsWith("@") && !text.startsWith("@&")) {
						const username = text.substring(1);
						const { id, displayName } = findUserByName(username);

						// Create a proper mention span
						span.className = "mention";
						span.setAttribute("data-type", "user");
						span.setAttribute("data-id", id || "");
						span.textContent = `@${displayName}`;
					}

					// Process #channel mentions
					else if (text.startsWith("#")) {
						const channelName = text.substring(1);
						const channel = findChannelByName(channelName);

						// Create a proper mention span
						span.className = "mention";
						span.setAttribute("data-type", "channel");
						span.setAttribute("data-id", channel.id || "");
						span.textContent = `#${channel.name}`;
					}

					// Process @&role mentions
					else if (
						text.startsWith("@&") ||
						(text.startsWith("@") && text.indexOf("&") === 1)
					) {
						const roleName = text.substring(text.indexOf("&") + 1);
						const role = findRoleByName(roleName);

						// Create a proper mention span
						span.className = "mention";
						span.setAttribute("data-type", "role");
						span.setAttribute("data-id", role.id || "");
						span.textContent = `@${role.name}`;
					}
				}
			};

			// Step 3: Process Discord-style mentions: <@ID>, <#ID>, <@&ID>
			const processDiscordMentions = () => {
				// Use regex to find all Discord-style mentions
				// Ulepszony pattern, który znajdzie wzmianki, nawet jeśli są one rozdzielone spacjami
				const mentionPattern = /<\s*(@&|@|#)\s*([0-9]+)\s*>/g;
				const content = rootElement.innerHTML;
				let match: RegExpExecArray | null;
				let processedContent = content;

				const mentionMatches: Array<{
					full: string;
					type: string;
					id: string;
					index: number;
				}> = [];

				while (true) {
					match = mentionPattern.exec(content);
					if (match === null) break;

					mentionMatches.push({
						full: match[0],
						type: match[1].trim(), // Usuwamy spacje
						id: match[2].trim(), // Usuwamy spacje
						index: match.index,
					});
				}

				// Jeśli nie znaleziono żadnych dopasowań z elastycznym wzorcem, spróbuj dokładnego wzorca
				if (mentionMatches.length === 0) {
					// Przeszukaj za pomocą dokładnego wzorca
					const exactPattern = /<(@&|@|#)([0-9]+)>/g;
					let exactMatch: RegExpExecArray | null;

					while (true) {
						exactMatch = exactPattern.exec(content);
						if (exactMatch === null) break;

						mentionMatches.push({
							full: exactMatch[0],
							type: exactMatch[1],
							id: exactMatch[2],
							index: exactMatch.index,
						});
					}
				}

				// Process in reverse order to avoid index shifting
				for (const mention of mentionMatches.sort(
					(a, b) => b.index - a.index,
				)) {
					let replacement = "";

					if (mention.type === "#" && data.mentionTypes?.includes("channel")) {
						const channel = data.guildData?.channels?.find(
							(c) => c.id === mention.id,
						);
						const channelName = channel?.name || "channel";
						replacement = `<span class="mention" data-type="channel" data-id="${mention.id}">#${channelName}</span>`;
					} else if (
						mention.type === "@&" &&
						data.mentionTypes?.includes("role")
					) {
						const role = data.guildData?.roles?.find(
							(r) => r.id === mention.id,
						);
						const roleName = role?.name || "role";
						replacement = `<span class="mention" data-type="role" data-id="${mention.id}">@${roleName}</span>`;
					} else if (
						mention.type === "@" &&
						data.mentionTypes?.includes("user")
					) {
						let displayName = "user";

						// Check if this is the current user
						if (mention.id === data.id) {
							displayName = data.displayName || data.username || "user";
						} else {
							// Look for the user in the provided data
							const user = data.users?.find((u) => u.id === mention.id);
							displayName = user?.username || "user";
						}

						replacement = `<span class="mention" data-type="user" data-id="${mention.id}">@${displayName}</span>`;
					}

					if (replacement) {
						processedContent =
							processedContent.substring(0, mention.index) +
							replacement +
							processedContent.substring(mention.index + mention.full.length);
					}
				}

				rootElement.innerHTML = processedContent;
			};

			// Step 4: Process variable placeholders like {user}, {channel}, etc.
			const processVariables = () => {
				const variablePattern = /{([^}]+)}/g;
				const content = rootElement.innerHTML;
				let match: RegExpExecArray | null;
				let processedContent = content;

				const variableMatches: Array<{
					full: string;
					variable: string;
					index: number;
				}> = [];

				while (true) {
					match = variablePattern.exec(content);
					if (match === null) break;

					variableMatches.push({
						full: match[0],
						variable: match[1].toLowerCase(),
						index: match.index,
					});
				}

				// Process in reverse order to avoid index shifting
				for (const v of variableMatches.sort((a, b) => b.index - a.index)) {
					let replacement = "";

					if (v.variable === "user" && data.mentionTypes?.includes("user")) {
						const displayName = data.displayName || data.username || "user";
						replacement = `<span class="mention" data-type="user" data-id="${data.id}">@${displayName}</span>`;
					} else if (v.variable === "server" && data.guildData) {
						replacement = data.guildData.name || "server";
					} else if (
						v.variable === "channel" &&
						data.mentionTypes?.includes("channel") &&
						data.guildData?.channels?.length
					) {
						const defaultChannel = data.guildData.channels[0];
						replacement = `<span class="mention" data-type="channel" data-id="${defaultChannel.id}">#${defaultChannel.name}</span>`;
					} else if (
						v.variable === "role" &&
						data.mentionTypes?.includes("role") &&
						data.guildData?.roles?.length
					) {
						const defaultRole = data.guildData.roles[0];
						replacement = `<span class="mention" data-type="role" data-id="${defaultRole.id}">@${defaultRole.name}</span>`;
					}

					if (replacement) {
						processedContent =
							processedContent.substring(0, v.index) +
							replacement +
							processedContent.substring(v.index + v.full.length);
					}
				}

				rootElement.innerHTML = processedContent;
			};

			// Run the processors
			processMentionSpans();
			processDiscordMentions();
			processVariables();

			// Step 5: Convert processed HTML to React elements
			// Find all proper mention spans
			const mentions = rootElement.querySelectorAll(".mention");
			const mentionElements: Array<{ id: string; element: ReactNode }> = [];

			for (const mention of Array.from(mentions)) {
				const type = mention.getAttribute("data-type") || "";
				const id = mention.getAttribute("data-id") || "";
				const content = mention.textContent || "";

				if (type && (id || content)) {
					mentionElements.push({
						id,
						element: (
							<Mention
								key={`mention-${type}-${id || content}-${mentionCounter++}`}
								data-type={type}
								data-id={id}
							>
								{content}
							</Mention>
						),
					});
				}
			}

			// Process remaining text nodes and non-mention elements
			const processNode = (node: Node): ReactNode[] => {
				const results: ReactNode[] = [];

				if (node.nodeType === Node.TEXT_NODE) {
					// Text node - just add the text
					if (node.textContent?.trim()) {
						results.push(node.textContent);
					}
				} else if (node.nodeType === Node.ELEMENT_NODE) {
					const element = node as HTMLElement;

					// Skip if it's a mention we've already processed
					if (element.classList.contains("mention")) {
						return results;
					}

					// Process children
					for (const child of Array.from(element.childNodes)) {
						results.push(...processNode(child));
					}
				}

				return results;
			};

			// Get text content outside of mention spans
			const textNodes = processNode(rootElement);

			// Combine mentions and text in the original order
			// Use textContent.indexOf for each mention to determine position
			const fullText = rootElement.textContent || "";
			const allElements = [
				...mentionElements.map((m) => {
					const element = m.element as React.ReactElement<{ children: string }>;
					const childText = element.props.children || "";
					const pos = fullText.indexOf(childText);
					return { pos: pos >= 0 ? pos : 0, content: m.element };
				}),
				...textNodes.map((text, idx) => {
					const textStr = text as string;
					const pos = fullText.indexOf(textStr);
					return { pos: pos >= 0 ? pos : idx * 1000, content: text };
				}),
			];

			// Sort by position and deduplicate mentions
			allElements.sort((a, b) => a.pos - b.pos);
			const processedIds = new Set<string>();

			for (const element of allElements) {
				// Skip if empty
				if (!element.content) continue;

				// For Mention components, check for duplicates
				if (
					React.isValidElement(element.content) &&
					element.content.type === Mention &&
					element.content.props
				) {
					const props = element.content.props as { "data-id"?: string };
					const id = props["data-id"];

					if (id) {
						// Skip if we've already included this ID
						if (processedIds.has(id)) continue;
						processedIds.add(id);
					}
				}

				pieces.push(element.content);
			}

			return pieces.length > 0 ? pieces : inputText;
		},
		[],
	);

	/**
	 * Format HTML for different mention types
	 */
	const formatMention = React.useCallback(
		(type: string, id: string, name: string): string => {
			switch (type) {
				case "user":
					return `<span class="mention" data-type="user" data-id="${id}">@${name}</span>`;
				case "role":
					return `<span class="mention" data-type="role" data-id="${id}">@${name}</span>`;
				case "channel":
					return `<span class="mention" data-type="channel" data-id="${id}">#${name}</span>`;
				default:
					return `<span class="mention" data-type="${type}" data-id="${id}">${name}</span>`;
			}
		},
		[],
	);

	/**
	 * Format Discord-style mention tags (<@ID>, <#ID>, <@&ID>)
	 */
	const formatDiscordMention = React.useCallback(
		(type: string, id: string): string => {
			switch (type) {
				case "user":
					return `<@${id}>`;
				case "role":
					return `<@&${id}>`;
				case "channel":
					return `<#${id}>`;
				default:
					return `<${type}${id}>`;
			}
		},
		[],
	);

	/**
	 * Extract mentions from HTML content
	 */
	const extractMentions = React.useCallback(
		(
			htmlContent: string,
		): Array<{ type: string; id: string; name: string }> => {
			const doc = parseHTML(htmlContent);
			if (!doc) return [];

			const mentions: Array<{ type: string; id: string; name: string }> = [];

			function parseHTML(html: string) {
				if (typeof DOMParser !== "undefined") {
					const parser = new DOMParser();
					return parser.parseFromString(`<div>${html}</div>`, "text/html");
				}
				return null;
			}

			const mentionSpans = doc.querySelectorAll(".mention");

			for (const span of Array.from(mentionSpans)) {
				const type = span.getAttribute("data-type") || "";
				const id = span.getAttribute("data-id") || "";
				const name = span.textContent?.replace(/^[@#]/, "") || "";

				if (type && id) {
					mentions.push({ type, id, name });
				}
			}

			return mentions;
		},
		[],
	);

	return {
		parseText,
		formatMention,
		formatDiscordMention,
		extractMentions,
	};
}
