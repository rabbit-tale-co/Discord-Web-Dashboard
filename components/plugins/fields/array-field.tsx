"use client";

import type { ReactNode } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import {
	FormField,
	FormItem,
	FormLabel,
	FormDescription,
	FormMessage,
	FormControl,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getCachedData } from "@/lib/cache";
import type { GuildData as BaseGuildData } from "@/hooks/use-guilds";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";

// Extend the type locally
interface GuildData extends BaseGuildData {
	channels: Channel[];
}

type Role = {
	id: string;
	name: string;
	color: number;
};

type Channel = {
	id: string;
	name: string;
	type: number;
	position: number;
	parent_id?: string;
};

interface ArrayFieldProps {
	name: string;
	label: string;
	description?: string;
	renderItem: (index: number, remove: (index: number) => void) => ReactNode;
	addButtonText?: string;
	defaultValue?: Record<string, unknown>;
	cardClassName?: string;
	contentClassName?: string;
}

export function ArrayField({
	name,
	label,
	description,
	renderItem,
	addButtonText = "Add Item",
	defaultValue = {},
	cardClassName = "",
	contentClassName = "p-3",
}: ArrayFieldProps) {
	const form = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name,
	});

	return (
		<FormItem>
			<FormLabel>{label}</FormLabel>
			{description && <FormDescription>{description}</FormDescription>}

			<div className="space-y-2">
				{fields.map((field, index) => (
					<Card key={field.id} className={cardClassName}>
						<CardContent className={contentClassName}>
							<div className="flex items-end gap-3">
								<div className="flex-1">{renderItem(index, remove)}</div>
							</div>
						</CardContent>
					</Card>
				))}

				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-2"
					onClick={() => append(defaultValue)}
				>
					<Plus className="mr-2 h-4 w-4" />
					{addButtonText}
				</Button>
			</div>

			<FormMessage />
		</FormItem>
	);
}
