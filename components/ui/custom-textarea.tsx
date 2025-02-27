"use client";

import type React from "react";
import type { TextareaHTMLAttributes } from "react";
import { HighlightedTextarea } from "./textarea";

export type Suggestion = {
	name: string;
	id: string;
	description?: string;
	example?: string;
};

interface CustomTextareaProps
	extends Omit<TextareaHTMLAttributes<HTMLDivElement>, "onChange" | "value"> {
	suggestions?: Suggestion[];
	guildId?: string;
	onSuggestionSelect?: (suggestion: string) => void;
	value?: string;
	onChange?: (value: string) => void;
}

export function CustomTextarea(props: CustomTextareaProps) {
	return (
		<div className="relative font-mono">
			<HighlightedTextarea {...props} />
		</div>
	);
}
