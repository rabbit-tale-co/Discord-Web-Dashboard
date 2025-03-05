/**
 * Mention UI Components
 *
 * This index file exports all mention-related components for easier imports
 */

// Base Components
export * from "./mention-textarea-base";
export * from "./mention-popover";
export * from "./emoji-picker";
export * from "./mention-textarea";

// Re-export types for convenience
export type {
	MentionType,
	MentionElement,
	CustomElement,
	MentionPlaceholderElement,
} from "./mention-textarea-base";

export type {
	MentionAnchor,
	Role,
	Channel,
	Variable,
	Category,
} from "./mention-popover";
