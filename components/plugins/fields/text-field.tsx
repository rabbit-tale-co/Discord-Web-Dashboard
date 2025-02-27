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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type TextFieldProps = {
	name: string;
	label: string;
	description?: string;
	placeholder?: string;
	multiline?: boolean;
};

export function TextField({
	name,
	label,
	description,
	placeholder,
	multiline = false,
}: TextFieldProps) {
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
						{multiline ? (
							<Textarea
								placeholder={placeholder}
								className="min-h-[100px]"
								{...field}
							/>
						) : (
							<Input placeholder={placeholder} {...field} />
						)}
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
