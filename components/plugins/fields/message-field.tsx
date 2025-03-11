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

// Rozszerzamy FormFieldProps o opcjonalny identyfikator
interface MessageFieldProps extends FormFieldProps {
	id?: string; // Unikalny identyfikator dla MentionTextarea
}

export function MessageField({
	name,
	label,
	description,
	showEmojiPicker = true,
	singleLine = false,
	placeholder,
	rows = 3,
	maxLength,
	id, // Dodajemy id jako prop
}: MessageFieldProps) {
	const form = useFormContext();

	// Generujemy unikalny identyfikator, jeśli nie został przekazany
	const uniqueId = useMemo(
		() => id || `mention-textarea-${name.replace(/\./g, "-")}`,
		[id, name],
	);

	// Ref do przechowywania ostatniej wartości pola
	const lastValueRef = useRef<string | undefined>();

	// Pobierz aktualną wartość pola
	const fieldValue = form.watch(name);

	// Aktualizuj lastValueRef, gdy zmienia się wartość pola
	useEffect(() => {
		if (fieldValue) {
			lastValueRef.current = fieldValue;
		}
	}, [fieldValue]);

	// Get or create variables and categories
	const variables = defaultVariables;
	const categories = defaultCategories;

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => {
				// Użyj ostatniej wartości, jeśli aktualna jest pusta (pomaga podczas przełączania zakładek)
				const valueToUse = field.value || lastValueRef.current || "";

				return (
					<FormItem>
						{label && <FormLabel>{label}</FormLabel>}
						<FormControl>
							<div className="relative">
								<MentionTextarea
									value={valueToUse}
									onChange={(value) => {
										// Aktualizuj lastValueRef
										lastValueRef.current = value;
										// Wywołaj oryginalny onChange
										field.onChange(value);
									}}
									placeholder={placeholder || "Enter your message..."}
									maxLength={maxLength}
									rows={rows}
									singleLine={singleLine}
									showEmojiPicker={showEmojiPicker}
									showSuggestions={true}
									variables={variables}
									categories={categories}
									id={uniqueId}
								/>
							</div>
						</FormControl>
						{description && <FormDescription>{description}</FormDescription>}
						<FormMessage />
					</FormItem>
				);
			}}
		/>
	);
}
