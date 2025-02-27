"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
} from "@/components/ui/form";
import {
	CustomTextarea,
	type Suggestion,
} from "@/components/ui/custom-textarea";

const SUGGESTIONS: Suggestion[] = [
	{
		name: "level",
		description: "User's current level",
		example: "5",
		type: "placeholder",
	},
	{
		name: "user",
		description: "User mention",
		example: "@User",
		type: "placeholder",
	},
	{
		name: "username",
		description: "User's name",
		example: "John",
		type: "placeholder",
	},
];

export function MessageField({
	name,
	label,
	description,
}: {
	name: string;
	label: string;
	description?: string;
}) {
	const form = useFormContext();

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem>
					<FormLabel>{label}</FormLabel>
					{description && <FormDescription>{description}</FormDescription>}
					<FormControl>
						<CustomTextarea
							{...field}
							suggestions={SUGGESTIONS}
							onSuggestionSelect={(suggestion) => {
								const value = field.value || "";
								const textarea = document.activeElement as HTMLTextAreaElement;
								const pos = textarea?.selectionStart || value.length;
								const newValue = `${value.slice(0, pos)}{${suggestion}}${value.slice(pos)}`;
								field.onChange(newValue);
							}}
						/>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
