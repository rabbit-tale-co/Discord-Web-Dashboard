"use client";

import type { AutoformatRule } from "@udecode/plate-autoformat";
import { AutoformatPlugin } from "@udecode/plate-autoformat/react";

// Create simple mark-mode autoformat rules for mentions
export const autoformatMentionRules: AutoformatRule[] = [
	// Variable mention rule
	{
		match: "{var}",
		mode: "mark",
		type: "span",
	},

	// Channel mention rule
	{
		match: "#channel",
		mode: "mark",
		type: "span",
	},

	// Role mention rule
	{
		match: "@role",
		mode: "mark",
		type: "span",
	},

	// Custom ID mention rule
	{
		match: "id:custom",
		mode: "mark",
		type: "span",
	},
];

// Export a standalone plugin for mention autoformatting
export const autoformatMentionPlugin = AutoformatPlugin.configure({
	options: {
		rules: autoformatMentionRules,
	},
});
