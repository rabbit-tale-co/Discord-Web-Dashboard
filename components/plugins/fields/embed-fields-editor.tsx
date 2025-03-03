import { Button } from "@/components/ui/button";
import { FormControl, FormItem } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { MentionTextarea } from "@/components/ui/textarea";
import { MinusCircle, PlusCircle } from "lucide-react";
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

interface EmbedField {
	name: string;
	value: string;
	inline: boolean;
	_id: string;
}

type FormValues = Record<string, unknown>;

interface EmbedFieldsEditorProps {
	field: {
		name: string;
		value: EmbedField[] | unknown[];
	};
	form: UseFormReturn<FormValues>;
	guildId: string;
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
							singleLine={true}
							showEmojiPicker={true}
							maxLength={256}
							guildId={guildId}
						/>
					</div>
					<Button
						variant="ghost"
						size="icon"
						type="button"
						onClick={handleRemove}
					>
						<MinusCircle className="h-4 w-4" />
					</Button>
				</div>
				<MentionTextarea
					placeholder="Field value"
					value={fieldValue}
					onChange={handleValueChange}
					singleLine={false}
					showEmojiPicker={true}
					maxLength={1024}
					guildId={guildId}
				/>
				<div className="flex items-center gap-2">
					<Switch checked={inlineValue} onCheckedChange={handleInlineChange} />
					<span className="text-sm text-muted-foreground">Inline</span>
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
	field,
	form,
	guildId,
}: EmbedFieldsEditorProps) {
	// Use refs to track previous values and avoid unnecessary updates
	const prevFieldValueRef = useRef<unknown[]>([]);
	const formUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Maintain a stable reference to form setValue
	const formSetValue = useMemo(() => form.setValue, [form]);

	// Counter for unique IDs to prevent duplicates
	const idCounterRef = useRef(0);

	// Generate a unique ID function with stable reference
	const generateUniqueId = useCallback(() => {
		idCounterRef.current += 1;
		return `embed-field-${idCounterRef.current}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
	}, []);

	// Optimize the field ID generation with memoization
	const ensureFieldsHaveIds = useCallback(
		(fieldValues: unknown[]): EmbedField[] => {
			if (!Array.isArray(fieldValues) || fieldValues.length === 0) return [];

			return fieldValues.map((fieldItem) => {
				// Handle completely undefined/null items
				if (!fieldItem) {
					return {
						name: "",
						value: "",
						inline: false,
						_id: generateUniqueId(),
					};
				}

				const item = fieldItem as Partial<EmbedField>;

				// Check if item has a valid ID before using it
				const itemId = item._id;
				const hasValidId =
					typeof itemId === "string" &&
					itemId.trim() !== "" &&
					!itemId.includes("undefined") &&
					!itemId.includes("null");

				// Use the valid ID or generate a new one
				const fieldId = hasValidId ? itemId : generateUniqueId();

				return {
					name: typeof item.name === "string" ? item.name : "",
					value: typeof item.value === "string" ? item.value : "",
					inline: Boolean(item.inline),
					_id: fieldId,
				};
			});
		},
		[generateUniqueId],
	);

	// Use state to track fields with guaranteed IDs
	const [fieldsWithIds, setFieldsWithIds] = useState<EmbedField[]>(() => {
		const initialValue = ensureFieldsHaveIds(
			Array.isArray(field.value) ? field.value : [],
		);
		prevFieldValueRef.current = [...initialValue];
		return initialValue;
	});

	// Batch form updates with debouncing to reduce cascading renders
	useEffect(() => {
		// Clear any existing timeout to prevent race conditions
		if (formUpdateTimeoutRef.current) {
			clearTimeout(formUpdateTimeoutRef.current);
		}

		// Only update if values have actually changed (shallow check first for performance)
		const hasChangedShallow =
			prevFieldValueRef.current.length !== fieldsWithIds.length;

		// If lengths differ, we know it changed, otherwise do deep check
		const hasChanged =
			hasChangedShallow || !deepEqual(prevFieldValueRef.current, fieldsWithIds);

		if (hasChanged) {
			// Debounce form updates to prevent rapid re-renders
			formUpdateTimeoutRef.current = setTimeout(() => {
				formSetValue(field.name, fieldsWithIds, { shouldDirty: true });
				prevFieldValueRef.current = [...fieldsWithIds];
			}, 150); // Small timeout to batch updates
		}

		// Cleanup timeout on unmount
		return () => {
			if (formUpdateTimeoutRef.current) {
				clearTimeout(formUpdateTimeoutRef.current);
			}
		};
	}, [field.name, fieldsWithIds, formSetValue]);

	// Handle external field value changes with memoization
	useEffect(() => {
		if (field.value && Array.isArray(field.value)) {
			const currentValues = ensureFieldsHaveIds(field.value);

			// Compare lengths first (fast check)
			if (currentValues.length !== fieldsWithIds.length) {
				setFieldsWithIds(currentValues);
				prevFieldValueRef.current = [...currentValues];
				return;
			}

			// If lengths match, do full comparison to avoid unnecessary updates
			if (!deepEqual(currentValues, fieldsWithIds)) {
				setFieldsWithIds(currentValues);
				prevFieldValueRef.current = [...currentValues];
			}
		}
	}, [field.value, ensureFieldsHaveIds, fieldsWithIds]);

	// Add a field with proper default values - stable reference
	const addField = useCallback(() => {
		try {
			const newField: EmbedField = {
				name: "",
				value: "",
				inline: false,
				_id: generateUniqueId(),
			};
			setFieldsWithIds((prev) => [...prev, newField]);
		} catch (error) {
			console.error("Error adding field:", error);
			toast.error("Failed to add embed field");
		}
	}, [generateUniqueId]);

	// Remove a field with stable reference
	const removeField = useCallback((index: number) => {
		try {
			setFieldsWithIds((prev) => {
				const updatedFields = [...prev];
				updatedFields.splice(index, 1);
				return updatedFields;
			});
		} catch (error) {
			console.error("Error removing field:", error);
			toast.error("Failed to remove embed field");
		}
	}, []);

	// Update a specific field with stable reference
	const updateField = useCallback(
		(index: number, key: keyof EmbedField, value: string | boolean) => {
			try {
				setFieldsWithIds((prev) => {
					const updatedFields = [...prev];
					if (updatedFields[index]) {
						updatedFields[index] = {
							...updatedFields[index],
							[key]: value,
						};
					}
					return updatedFields;
				});
			} catch (error) {
				console.error(`Error updating field ${key}:`, error);
				toast.error("Failed to update embed field");
			}
		},
		[],
	);

	// Memoize rendered fields to prevent unnecessary re-renders
	const renderedFields = useMemo(() => {
		return fieldsWithIds.map((embedField, index) => (
			<EmbedFieldItem
				key={embedField._id}
				embedField={embedField}
				index={index}
				guildId={guildId}
				onUpdate={updateField}
				onRemove={removeField}
			/>
		));
	}, [fieldsWithIds, guildId, updateField, removeField]);

	// Memoize the button to prevent re-renders
	const addButton = useMemo(
		() => (
			<Button
				type="button"
				variant="outline"
				className="w-full"
				onClick={addField}
			>
				<PlusCircle className="h-4 w-4 mr-2" />
				Add Field
			</Button>
		),
		[addField],
	);

	return (
		<FormItem className="w-full flex flex-col gap-2">
			<FormControl>
				<div className="space-y-2">
					{renderedFields}
					{addButton}
				</div>
			</FormControl>
		</FormItem>
	);
}
