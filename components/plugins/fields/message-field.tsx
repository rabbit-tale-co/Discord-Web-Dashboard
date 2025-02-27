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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

type MessageFieldProps = {
	name: string;
	label: string;
	description?: string;
	placeholders?: string[];
	multiline?: boolean;
};

export function MessageField({
	name,
	label,
	description,
	placeholders,
	multiline = false,
}: MessageFieldProps) {
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
								className="min-h-[120px] font-mono text-sm"
								{...field}
							/>
						) : (
							<Input {...field} />
						)}
					</FormControl>
					{placeholders && placeholders.length > 0 && (
						<Alert variant="default" className="mt-2">
							<InfoIcon className="h-4 w-4" />
							<AlertDescription>
								Dostępne placeholdery:{" "}
								{placeholders.map((p) => `{${p}}`).join(", ")}
							</AlertDescription>
						</Alert>
					)}
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
