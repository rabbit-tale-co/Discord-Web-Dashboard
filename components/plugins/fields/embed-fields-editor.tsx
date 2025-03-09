import { useFormContext } from "react-hook-form";
import { TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useId, useEffect, useState, useCallback } from "react";
import { FormField } from "@/components/ui/form";
import { ArrayField } from "./array-field";
import type { GuildData } from "@/types/guild";
import React from "react";

import {
	FormControl,
	FormDescription,
	FormLabel,
	FormMessage,
	FormItem,
} from "@/components/ui/form";

import type { Variable, Category } from "@/lib/types/discord";
import type { Role, Channel } from "@/components/ui/mention/mention-popover";
import { MessageField } from "./message-field";
import { MentionTextarea } from "@/components/ui/mention/mention-textarea";
// Default variables
const defaultVariables: Variable[] = [
	{
		id: "user",
		name: "user",
		category: "mention",
	},
	{
		id: "username",
		name: "username",
		category: "mention",
	},
	{
		id: "server",
		name: "server",
		category: "mention",
	},
	{
		id: "server_name",
		name: "server_name",
		category: "mention",
	},
	{
		id: "server_image",
		name: "server_image",
		category: "mention",
	},
	{
		id: "avatar",
		name: "avatar",
		category: "mention",
	},
];

// Default categories
const defaultCategories: Category[] = [
	{
		id: "mention",
		name: "Mentions",
		icon: "💬",
	},
];

// Simple ID generation function
function generateId(): string {
	return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// Interface for window with additional data
interface WindowWithVariables extends Window {
	__guildData?: GuildData;
	__welcomeVariables?: Variable[];
	__variableCategories?: Category[];
}

// Interface for embed field
interface EmbedField {
	name: string;
	value: string;
	inline: boolean;
	_id: string;
}

// Interface for component props
interface EmbedFieldsEditorProps {
	name: string;
	label: string;
	description?: string;
}

/**
 * Component for rendering the embed field editor
 */
export function EmbedFieldsEditor({
	name,
	label,
	description,
}: EmbedFieldsEditorProps) {
	const { control, getValues, setValue } = useFormContext();
	const [variables, setVariables] = useState<Variable[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);

	// Render each embed field
	const renderEmbedField = (index: number, remove: (index: number) => void) => (
		<FormField
			key={`${name}.${index}`}
			control={control}
			name={`${name}.${index}`}
			render={({ field }) => {
				const embedField = field.value as EmbedField;
				return (
					<FormItem className="space-y-2">
						<div className="flex items-center justify-between">
							<FormLabel>{`Field ${index + 1}`}</FormLabel>
							<Button
								type="button"
								variant="ghost"
								className="h-8 px-2"
								onClick={() => remove(index)}
							>
								<TrashIcon className="h-4 w-4" />
							</Button>
						</div>
						<FormControl>
							<div className="space-y-2">
								{/* Field Name */}
								<FormItem>
									<FormControl>
										<MentionTextarea
											value={embedField.name}
											placeholder="Field name"
											singleLine
											showEmojiPicker={false}
											maxLength={100}
											variables={variables}
											categories={categories}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>

								{/* Field Value */}
								<FormItem>
									<FormControl>
										<MentionTextarea
											value={embedField.value}
											placeholder="Field value"
											rows={3}
											showEmojiPicker={false}
											maxLength={1024}
											variables={variables}
											categories={categories}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>

								{/* Inline Toggle */}
								<div className="flex items-center space-x-2">
									<Switch id={`inline-${index}`} checked={embedField.inline} />
									<label
										htmlFor={`inline-${index}`}
										className="text-sm font-medium leading-none cursor-pointer"
									>
										Inline field
									</label>
								</div>
							</div>
						</FormControl>
					</FormItem>
				);
			}}
		/>
	);

	return (
		<div className="space-y-4">
			<div className="space-y-1">
				{label && <FormLabel>{label}</FormLabel>}
				{description && <FormDescription>{description}</FormDescription>}
			</div>

			<ArrayField
				name={name}
				label="Add Field"
				description=""
				renderItem={renderEmbedField}
				defaultValue={{
					name: "",
					value: "",
					inline: false,
					_id: generateId(),
				}}
			/>
		</div>
	);
}
