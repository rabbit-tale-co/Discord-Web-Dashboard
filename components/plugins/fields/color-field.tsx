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

type ColorFieldProps = {
	name: string;
	label: string;
	description?: string;
};

export function ColorField({ name, label, description }: ColorFieldProps) {
	const form = useFormContext();

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem>
					<FormLabel>{label}</FormLabel>
					{description && <FormDescription>{description}</FormDescription>}
					<div className="flex items-center gap-2">
						<div
							className="h-8 w-8 rounded-md border"
							style={{ backgroundColor: field.value || "#000000" }}
						/>
						<FormControl>
							<Input
								type="color"
								{...field}
								onChange={(e) => {
									field.onChange(e.target.value);
								}}
								className="w-14 h-8 p-0"
							/>
						</FormControl>
						<Input
							value={field.value || "#000000"}
							onChange={(e) => {
								field.onChange(e.target.value);
							}}
							placeholder="#000000"
							className="w-32"
						/>
					</div>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
