import { useFormContext } from "react-hook-form";
import { TrashIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useId, useEffect, useState, useCallback, useRef } from "react";
import { FormField } from "@/components/ui/form";
import { ArrayField } from "./array-field";
import type { GuildData } from "@/types/guild";
import React from "react";
import { toast } from "sonner";

import {
	FormControl,
	FormDescription,
	FormLabel,
	FormMessage,
	FormItem,
} from "@/components/ui/form";

import type { Variable, Category } from "@/lib/types/discord";
import { MessageField } from "./message-field";

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
	id?: string;
	hasPremium?: boolean;
}

const MAX_FREE_FIELDS = 5;

/**
 * Component for rendering the embed field editor
 */
export function EmbedFieldsEditor({
	name,
	label,
	description,
	id = "embed-fields-editor",
	hasPremium = false,
}: EmbedFieldsEditorProps) {
	const { getValues, setValue } = useFormContext();
	const [fields, setFields] = useState<EmbedField[]>([]);

	// Ref do przechowywania ostatnich wartości pól
	const lastFieldsRef = useRef<EmbedField[]>([]);

	// Pobierz aktualne wartości pól
	useEffect(() => {
		const currentFields = getValues(name) || [];
		setFields(currentFields);

		// Jeśli mamy wartości, zaktualizuj lastFieldsRef
		if (currentFields && currentFields.length > 0) {
			lastFieldsRef.current = [...currentFields];
		}
	}, [getValues, name]);

	// Funkcja do aktualizacji pola
	const updateField = useCallback(
		(index: number, fieldName: keyof EmbedField, value: string | boolean) => {
			const updatedFields = [...fields];
			if (updatedFields[index]) {
				updatedFields[index] = {
					...updatedFields[index],
					[fieldName]: value,
				};
				setValue(name, updatedFields, { shouldValidate: true });
				setFields(updatedFields);

				// Aktualizuj lastFieldsRef
				lastFieldsRef.current = [...updatedFields];
			}
		},
		[fields, name, setValue],
	);

	// Funkcja do dodawania nowego pola
	const addField = useCallback(() => {
		if (!hasPremium && fields.length >= MAX_FREE_FIELDS) {
			toast.error("Field limit reached", {
				description: "Upgrade to premium to add more than 5 fields.",
			});
			return;
		}

		const newField: EmbedField = {
			name: "",
			value: "",
			inline: false,
			_id: generateId(),
		};
		const updatedFields = [...fields, newField];
		setValue(name, updatedFields, { shouldValidate: true });
		setFields(updatedFields);

		// Aktualizuj lastFieldsRef
		lastFieldsRef.current = [...updatedFields];
	}, [fields, name, setValue, hasPremium]);

	// Funkcja do usuwania pola
	const removeField = useCallback(
		(index: number) => {
			const updatedFields = [...fields];
			updatedFields.splice(index, 1);
			setValue(name, updatedFields, { shouldValidate: true });
			setFields(updatedFields);

			// Aktualizuj lastFieldsRef
			lastFieldsRef.current = [...updatedFields];
		},
		[fields, name, setValue],
	);

	// Jeśli nie mamy pól, ale mamy zapisane w lastFieldsRef, użyj ich
	useEffect(() => {
		if (fields.length === 0 && lastFieldsRef.current.length > 0) {
			setFields([...lastFieldsRef.current]);
			setValue(name, [...lastFieldsRef.current], { shouldValidate: true });
		}
	}, [fields.length, name, setValue]);

	return (
		<div className="space-y-4">
			<div>
				<FormLabel>{label}</FormLabel>
				{description && <FormDescription>{description}</FormDescription>}
				<FormDescription className="mt-1">
					{hasPremium
						? "Premium: Unlimited fields available"
						: `Free: ${fields.length}/${MAX_FREE_FIELDS} fields used`}
				</FormDescription>
			</div>

			<div className="space-y-4">
				{fields.map((field, index) => (
					<div
						key={field._id || index}
						className="border rounded-md p-4 space-y-3 relative"
						style={{ zIndex: 5 }}
					>
						<div className="flex items-center justify-between">
							<FormLabel>{`Field ${index + 1}`}</FormLabel>
							<Button
								type="button"
								variant="ghost"
								size="iconSm"
								onClick={() => removeField(index)}
							>
								<TrashIcon className="h-4 w-4" />
							</Button>
						</div>

						{/* Field Name */}
						<div className="space-y-2">
							<MessageField
								name={`${name}.${index}.name`}
								placeholder={`Field ${index + 1} name`}
								singleLine={true}
								showEmojiPicker={false}
								maxLength={100}
								id={`${id}-field-${index}-name`}
							/>
						</div>

						{/* Field Value */}
						<div className="space-y-2">
							<MessageField
								name={`${name}.${index}.value`}
								placeholder="Field value"
								rows={3}
								showEmojiPicker={false}
								maxLength={1024}
								id={`${id}-field-${index}-value`}
							/>
						</div>

						{/* Inline Toggle */}
						<div className="flex items-center space-x-2">
							<Switch
								id={`${id}-inline-${index}`}
								checked={field.inline}
								onCheckedChange={(checked) =>
									updateField(index, "inline", checked)
								}
							/>
							<label
								htmlFor={`${id}-inline-${index}`}
								className="text-sm font-medium leading-none cursor-pointer"
							>
								Inline field
							</label>
						</div>
					</div>
				))}

				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-2"
					onClick={addField}
					disabled={!hasPremium && fields.length >= MAX_FREE_FIELDS}
				>
					<PlusIcon className="mr-2 h-4 w-4" />
					Add Field{" "}
					{!hasPremium && fields.length >= MAX_FREE_FIELDS && "(Premium Only)"}
				</Button>
			</div>
		</div>
	);
}
