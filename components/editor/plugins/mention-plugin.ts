"use client";

import { MentionPlugin } from "@udecode/plate-mention/react";

// Base mention plugin with common configurations
export const mentionPlugin = MentionPlugin.configure({
	options: {
		triggerPreviousCharPattern: /^$|^[\s"']$/,
	},
});
