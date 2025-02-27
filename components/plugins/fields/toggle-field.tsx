"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

type ToggleFieldProps = {
	name: string;
	label: string;
	description?: string;
};

export function ToggleField({ name, label, description }: ToggleFieldProps) {
	const form = useFormContext();

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
					<div className="space-y-0.5">
						<FormLabel className="text-base">{label}</FormLabel>
						{description && <FormDescription>{description}</FormDescription>}
					</div>
					<FormControl>
						<Switch checked={field.value} onCheckedChange={field.onChange} />
					</FormControl>
				</FormItem>
			)}
		/>
	);
}
