"use client";

import React from "react";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
} from "@/components/ui/form";
import { getCachedData } from "@/lib/cache";
import type { GuildData } from "@/types/guild";
import type { FormFieldProps } from "@/lib/types";
import type { Variable, Category } from "@/lib/types/discord";
import { MentionTextarea } from "@/components/ui/mention";
import { useParams } from "next/navigation";

// Default variables and categories for consistency with welcome-form.tsx
const defaultVariables: Variable[] = [
	{ id: "user", name: "user", category: "mention" },
	{ id: "server", name: "server", category: "mention" },
	{ id: "server_name", name: "server_name", category: "mention" },
	{ id: "username", name: "username", category: "mention" },
	{ id: "server_image", name: "server_image", category: "mention" },
	{ id: "avatar", name: "avatar", category: "mention" },
];

const defaultCategories: Category[] = [
	{ id: "mention", name: "Mentions", icon: "💬" },
];

export function MessageField({
	name,
	label,
	description,
	showEmojiPicker = true,
	singleLine = false,
	placeholder,
	rows = 3,
	maxLength,
}: FormFieldProps) {
	const form = useFormContext();

	// Get or create variables and categories
	const variables = defaultVariables;
	const categories = defaultCategories;

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem>
					{label && <FormLabel>{label}</FormLabel>}
					<FormControl>
						<div className="relative">
							<MentionTextarea
								value={field.value || ""}
								onChange={field.onChange}
								placeholder={placeholder || "Enter your message..."}
								maxLength={maxLength}
								rows={rows}
								singleLine={singleLine}
								showEmojiPicker={showEmojiPicker}
								showSuggestions={true}
								variables={variables}
								categories={categories}
							/>
						</div>
					</FormControl>
					{description && <FormDescription>{description}</FormDescription>}
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
