// TestMentionField.tsx
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
import { MentionTextarea } from "./mention-textarea";

export interface MentionFieldProps {
	name: string;
	label?: string;
	description?: string;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	rows?: number;
	maxLength?: number;
	id?: string;
}

export function MentionField({
	name,
	label,
	description,
	placeholder = "Type '@' to mention someone...",
	disabled = false,
	className,
	rows = 3,
	maxLength,
	id,
}: MentionFieldProps) {
	const form = useFormContext();

	// Handle the case when form context is not available
	if (!form) {
		console.error("MentionField must be used within a FormProvider");
		return (
			<div className="p-4 border border-red-500 rounded-md">
				Error: MentionField must be used within a Form component
			</div>
		);
	}

	// Guard against missing 'control'
	if (!form.control) {
		console.error("Form control is not available");
		return (
			<div className="p-4 border border-red-500 rounded-md">
				Error: Form control is not available
			</div>
		);
	}

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem>
					{label && <FormLabel>{label}</FormLabel>}
					<FormControl>
						<MentionTextarea
							name={name}
							value={field.value || ""}
							onChange={field.onChange}
							placeholder={placeholder}
							disabled={disabled || field.disabled}
							className={className}
							rows={rows}
							maxLength={maxLength}
							id={id}
						/>
					</FormControl>
					{description && <FormDescription>{description}</FormDescription>}
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
