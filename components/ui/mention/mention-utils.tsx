import * as React from "react";
import type { GuildData } from "@/types/guild";
import { useMentionFormatter } from "@/hooks/use-mention-formatter";
import type { MentionBaseProps } from "@/hooks/use-mention-formatter";
import { Mention } from "@/hooks/use-mention-formatter";

/**
 * Extended GuildData type with users for mention rendering
 */
export interface ExtendedGuildData extends GuildData {
	users?: Array<{ id: string; username: string }>;
}

/**
 * Types of mentions supported by the system
 */
export type MentionType = "user" | "role" | "channel" | "variable";

/**
 * Represents a role in the system
 */
export interface Role {
	id: string;
	name: string;
	color?: number;
}

/**
 * Represents a channel in the system
 */
export interface Channel {
	id: string;
	name: string;
	type?: number;
}

/**
 * Represents a variable that can be used in messages
 */
export interface Variable {
	id: string;
	name: string;
	description?: string;
	example?: string;
	category: string;
}

/**
 * Represents a category of variables
 */
export interface Category {
	id: string;
	name: string;
	icon: string;
}

/**
 * Interface for mention HTML rendering
 */
export interface MentionRendererProps {
	content: string;
	userData?: {
		id: string;
		username?: string;
		avatar: string | null;
		displayName?: string;
	};
	guildData?: ExtendedGuildData;
	mentionTypes?: string[];
}

/**
 * Component to render HTML content with formatted mentions
 */
export function MentionRenderer({
	content,
	userData,
	guildData,
	mentionTypes = ["user", "role", "channel"],
}: MentionRendererProps) {
	const { parseText } = useMentionFormatter();

	// Create mention data from props
	const mentionData = React.useMemo(
		() => ({
			id: userData?.id || "",
			username: userData?.username,
			displayName: userData?.displayName,
			avatar: userData?.avatar || null,
			guildData,
			mentionTypes,
		}),
		[userData, guildData, mentionTypes],
	);

	// Parse the text to convert mentions to components
	const parsedContent = React.useMemo(() => {
		return parseText(content, mentionData);
	}, [content, mentionData, parseText]);

	return <>{parsedContent}</>;
}

/**
 * Custom mention components for different types
 */
export const UserMention: React.FC<MentionBaseProps> = (props) => (
	<Mention data-type="user" {...props} />
);

export const RoleMention: React.FC<MentionBaseProps> = (props) => (
	<Mention data-type="role" {...props} />
);

export const ChannelMention: React.FC<MentionBaseProps> = (props) => (
	<Mention data-type="channel" {...props} />
);

export const VariableMention: React.FC<MentionBaseProps> = (props) => (
	<Mention data-type="variable" {...props} />
);

/**
 * Helper functions for working with mentions
 */

/**
 * Get a user's display name from ID using guild data
 */
export function getUsernameFromId(
	userId: string,
	guildData?: ExtendedGuildData,
): string {
	if (!guildData?.users) return "user";

	const user = guildData.users.find((u) => u.id === userId);
	return user?.username || "user";
}

/**
 * Get a role's name from ID using guild data
 */
export function getRoleNameFromId(
	roleId: string,
	guildData?: ExtendedGuildData,
): string {
	if (!guildData?.roles) return "role";

	const role = guildData.roles.find((r) => r.id === roleId);
	return role?.name || "role";
}

/**
 * Get a channel's name from ID using guild data
 */
export function getChannelNameFromId(
	channelId: string,
	guildData?: ExtendedGuildData,
): string {
	if (!guildData?.channels) return "channel";

	const channel = guildData.channels.find((c) => c.id === channelId);
	return channel?.name || "channel";
}

/**
 * Utility function to extract mentions from text content
 */
export function extractMentionsFromText(text: string): {
	users: string[];
	roles: string[];
	channels: string[];
} {
	const { extractMentions } = useMentionFormatter();
	const mentions = extractMentions(text);

	return {
		users: mentions.filter((m) => m.type === "user").map((m) => m.id),
		roles: mentions.filter((m) => m.type === "role").map((m) => m.id),
		channels: mentions.filter((m) => m.type === "channel").map((m) => m.id),
	};
}
