/**
 * Mention UI Components
 *
 * This index file exports all mention-related components for easier imports
 */

// Export types and components from mention-utils
export type {
	MentionType,
	Role,
	Channel,
	Variable,
	Category,
	MentionRendererProps,
	ExtendedGuildData,
} from "./mention-utils";

export {
	UserMention,
	RoleMention,
	ChannelMention,
	VariableMention,
	MentionRenderer,
	getUsernameFromId,
	getRoleNameFromId,
	getChannelNameFromId,
	extractMentionsFromText,
} from "./mention-utils";

// Export core components
export { MentionTextarea } from "./mention-textarea";
export { EmojiPicker } from "./emoji-picker";

// Re-export from the formatter hook
export { useMentionFormatter, Mention } from "@/hooks/use-mention-formatter";
