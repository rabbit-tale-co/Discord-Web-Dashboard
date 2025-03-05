import { Button } from "@/components/ui/button";
import { FormControl, FormItem } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { MentionTextarea } from "@/components/ui/mention/mention-textarea";
import { CircleMinus, Minus, Trash } from "lucide-react";
import { toast } from "sonner";
import {
	useId,
	useEffect,
	useState,
	useCallback,
	useRef,
	memo,
	useMemo,
} from "react";
import type { UseFormReturn } from "react-hook-form";
import { deepEqual } from "@/lib/deep-equal";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ArrayField } from "./array-field";

interface EmbedField {
	name: string;
	value: string;
	inline: boolean;
	_id: string;
}

type FormValues = Record<string, unknown>;

interface EmbedFieldsEditorProps {
	name: string;
	label: string;
	description?: string;
}

// Optimized function for comparing embed fields efficiently
const areEmbedFieldsEqual = (a: EmbedField, b: EmbedField): boolean => {
	return (
		a.name === b.name &&
		a.value === b.value &&
		a.inline === b.inline &&
		a._id === b._id
	);
};

// Optimized component for field items with improved memoization
const EmbedFieldItem = memo(
	({
		embedField,
		index,
		guildId,
		onUpdate,
		onRemove,
	}: {
		embedField: EmbedField;
		index: number;
		guildId: string;
		onUpdate: (
			index: number,
			key: keyof EmbedField,
			value: string | boolean,
		) => void;
		onRemove: (index: number) => void;
	}) => {
		// Optimized event handlers with stable references
		const handleNameChange = useCallback(
			(value: string) => {
				onUpdate(index, "name", value);
			},
			[index, onUpdate],
		);

		const handleValueChange = useCallback(
			(value: string) => {
				onUpdate(index, "value", value);
			},
			[index, onUpdate],
		);

		const handleInlineChange = useCallback(
			(checked: boolean) => {
				onUpdate(index, "inline", checked);
			},
			[index, onUpdate],
		);

		const handleRemove = useCallback(() => {
			onRemove(index);
		}, [index, onRemove]);

		// Memoize props passed to child components to prevent unnecessary renders
		const nameValue = useMemo(() => embedField.name, [embedField.name]);
		const fieldValue = useMemo(() => embedField.value, [embedField.value]);
		const inlineValue = useMemo(() => embedField.inline, [embedField.inline]);

		return (
			<div
				key={embedField._id}
				className="border p-2 rounded-md flex flex-col gap-2"
			>
				<div className="flex items-center gap-2">
					<div className="flex-1">
						<MentionTextarea
							placeholder="Field name"
							value={nameValue}
							onChange={handleNameChange}
							singleLine
							showEmojiPicker={true}
							maxLength={50}
						/>
						{/* <div className="text-xs text-muted-foreground text-right mt-1">
							{nameValue.replace(/<[^>]*>/g, "").length}/50
						</div> */}
					</div>
				</div>
				<MentionTextarea
					placeholder="Field value"
					value={fieldValue}
					onChange={handleValueChange}
					singleLine={false}
					showEmojiPicker={true}
					maxLength={1024}
					rows={6}
				/>
				<div className="text-xs text-muted-foreground text-right mt-1">
					{fieldValue.replace(/<[^>]*>/g, "").length}/1024
				</div>
				<div className="flex items-center justify-between">
					<FormField
						name={`${guildId}.${index}.inline`}
						render={({ field }) => (
							<FormItem className="flex items-center space-x-2">
								<FormControl>
									<Switch
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
								<label className="text-sm font-medium leading-none">
									Inline field
								</label>
							</FormItem>
						)}
					/>
					<Button
						variant="destructive"
						size="icon"
						onClick={handleRemove}
						className="h-8 w-8"
					>
						<Trash className="h-4 w-4" />
					</Button>
				</div>
			</div>
		);
	},
	// Custom comparison function optimized for performance
	(prevProps, nextProps) => {
		return (
			prevProps.index === nextProps.index &&
			prevProps.guildId === nextProps.guildId &&
			areEmbedFieldsEqual(prevProps.embedField, nextProps.embedField)
		);
	},
);

// Set displayName for React DevTools
EmbedFieldItem.displayName = "EmbedFieldItem";

export function EmbedFieldsEditor({
	name,
	label,
	description,
}: EmbedFieldsEditorProps) {
	const renderEmbedField = (index: number, remove: (index: number) => void) => (
		<div className="space-y-4 w-full">
			<FormField
				name={`${name}.${index}.name`}
				render={({ field }) => (
					<FormItem>
						<FormControl>
							<MentionTextarea
								placeholder="Field name"
								value={field.value}
								onChange={field.onChange}
								singleLine={true}
								showEmojiPicker={true}
								maxLength={50}
							/>
						</FormControl>
						{/* <div className="text-xs text-muted-foreground text-right mt-1">
							{field.value ? field.value.replace(/<[^>]*>/g, "").length : 0}/50
						</div> */}
					</FormItem>
				)}
			/>
			<FormField
				name={`${name}.${index}.value`}
				render={({ field }) => (
					<FormItem>
						<FormControl>
							<MentionTextarea
								placeholder="Field value"
								value={field.value}
								onChange={field.onChange}
								singleLine={false}
								showEmojiPicker={true}
								maxLength={1024}
							/>
						</FormControl>
						{/* <div className="text-xs text-muted-foreground text-right mt-1">
							{field.value ? field.value.replace(/<[^>]*>/g, "").length : 0}
							/1024
						</div> */}
					</FormItem>
				)}
			/>
			<div className="flex items-center justify-between">
				<FormField
					name={`${name}.${index}.inline`}
					render={({ field }) => (
						<FormItem className="flex items-center space-x-2">
							<FormControl>
								<Switch
									checked={field.value}
									onCheckedChange={field.onChange}
								/>
							</FormControl>
							<label className="text-sm font-medium leading-none">
								Inline field
							</label>
						</FormItem>
					)}
				/>
				<Button variant="ghost" size="iconSm" onClick={() => remove(index)}>
					<CircleMinus className="size-4" />
				</Button>
			</div>
		</div>
	);

	return (
		<ArrayField
			name={name}
			label={label}
			description={description}
			renderItem={renderEmbedField}
			addButtonText="Add Field"
			defaultValue={{ name: "", value: "", inline: false }}
			cardClassName="overflow-hidden"
		/>
	);
}
