"use client";

import React, {
	createContext,
	forwardRef,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import type { PointRef, TElement } from "@udecode/plate";
import { cn } from "@/lib/utils";
import { useComposedRef, useEditorRef } from "@udecode/plate/react";
import {
	useComboboxInput,
	useHTMLInputCursorState,
} from "@udecode/plate-combobox/react";

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

// Define types for items
export interface ComboboxItem {
	id: string;
	value: string;
	name: string;
	// Other optional properties
	[key: string]: unknown;
}

// Simple context to share data between components
type InlineComboboxContextValue = {
	inputRef: React.RefObject<HTMLInputElement | null>;
	inputProps: Record<string, unknown>;
	removeInput: (focusEditor?: boolean) => void;
	showTrigger: boolean;
	trigger: string;
	setValue: (value: string) => void;
	open: boolean;
	setOpen: (open: boolean) => void;
};

const InlineComboboxContext = createContext<InlineComboboxContextValue | null>(
	null,
);

function useInlineCombobox() {
	const context = useContext(InlineComboboxContext);
	if (!context) {
		throw new Error("useInlineCombobox must be used within an InlineCombobox");
	}
	return context;
}

// Main inline combobox component
interface InlineComboboxProps {
	children: React.ReactNode;
	element: TElement;
	trigger: string;
	showTrigger?: boolean;
	value?: string;
	setValue?: (value: string) => void;
	filter?: boolean | ((item: ComboboxItem, search: string) => boolean);
	hideWhenNoValue?: boolean;
	items?: ComboboxItem[];
}

function InlineCombobox({
	children,
	element,
	showTrigger = true,
	trigger,
	value: valueProp,
	setValue: setValueProp,
	filter,
	hideWhenNoValue,
	items = [],
}: InlineComboboxProps) {
	const editor = useEditorRef();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const cursorState = useHTMLInputCursorState(inputRef);

	// State for controlled or uncontrolled value
	const [valueState, setValueState] = useState("");
	const [open, setOpen] = useState(false);

	const hasValueProp = valueProp !== undefined;
	const value = hasValueProp ? valueProp : valueState;

	const setValue = useCallback(
		(newValue: string) => {
			setValueProp?.(newValue);
			if (!hasValueProp) {
				setValueState(newValue);
			}
		},
		[setValueProp, hasValueProp],
	);

	// Track insertion point
	const [insertPoint, setInsertPoint] = useState<PointRef | null>(null);

	useEffect(() => {
		const path = editor.api.findPath(element);
		if (!path) return;

		const point = editor.api.before(path);
		if (!point) return;

		const pointRef = editor.api.pointRef(point);
		setInsertPoint(pointRef);

		return () => {
			pointRef.unref();
		};
	}, [editor, element]);

	// Setup combobox input
	const { props: inputProps, removeInput } = useComboboxInput({
		cancelInputOnBlur: false,
		cursorState,
		ref: inputRef,
		onCancelInput: (cause) => {
			if (cause !== "backspace") {
				editor.tf.insertText(trigger + value, {
					at: insertPoint?.current ?? undefined,
				});
			}
			if (cause === "arrowLeft" || cause === "arrowRight") {
				editor.tf.move({
					distance: 1,
					reverse: cause === "arrowLeft",
				});
			}
		},
	});

	// Create context value
	const contextValue = useMemo(
		() => ({
			inputRef,
			inputProps,
			removeInput,
			showTrigger,
			trigger,
			setValue,
			open,
			setOpen,
		}),
		[inputProps, removeInput, showTrigger, trigger, setValue, open],
	);

	return (
		<InlineComboboxContext.Provider value={contextValue}>
			<span contentEditable={false}>{children}</span>
		</InlineComboboxContext.Provider>
	);
}

// Input component for combobox
const InlineComboboxInput = forwardRef<
	HTMLInputElement,
	React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, propRef) => {
	const { inputProps, inputRef, showTrigger, trigger } = useInlineCombobox();

	const ref = useComposedRef(propRef, inputRef);

	return (
		<>
			{showTrigger && trigger}
			<span className="relative min-h-[1lh]">
				<span
					className="invisible overflow-hidden text-nowrap"
					aria-hidden="true"
				>
					{props.value || "\u200B"}
				</span>

				<input
					ref={ref}
					className={cn(
						"absolute top-0 left-0 w-full h-full bg-transparent outline-none",
						className,
					)}
					{...inputProps}
					{...props}
				/>
			</span>
		</>
	);
});

InlineComboboxInput.displayName = "InlineComboboxInput";

// Trigger component
const InlineComboboxTrigger = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
	const { open, setOpen } = useInlineCombobox();

	return (
		<PopoverTrigger asChild>
			<div
				ref={ref}
				className={cn("cursor-pointer", className)}
				onClick={() => setOpen(!open)}
				{...props}
			>
				{children}
			</div>
		</PopoverTrigger>
	);
});

InlineComboboxTrigger.displayName = "InlineComboboxTrigger";

// Content component
const InlineComboboxContent = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
	const { open, setOpen } = useInlineCombobox();

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverContent
				ref={ref}
				className={cn(
					"z-50 max-h-[288px] w-[300px] overflow-y-auto rounded-md bg-popover shadow-md p-0",
					className,
				)}
				{...props}
			>
				<Command>
					<CommandList>{children}</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
});

InlineComboboxContent.displayName = "InlineComboboxContent";

// Item component
interface InlineComboboxItemProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
	value: string;
	onItemSelect?: (value: string) => void;
	focusEditor?: boolean;
	label?: string;
	group?: string;
	keywords?: string[];
}

const InlineComboboxItem = forwardRef<HTMLDivElement, InlineComboboxItemProps>(
	(
		{
			className,
			children,
			value,
			onItemSelect,
			focusEditor = true,
			label,
			group,
			keywords,
			...props
		},
		ref,
	) => {
		const { removeInput, setValue, setOpen } = useInlineCombobox();

		const handleSelect = useCallback(() => {
			setValue(value);
			removeInput(focusEditor);
			setOpen(false);
			onItemSelect?.(value);
		}, [value, removeInput, setValue, setOpen, focusEditor, onItemSelect]);

		return (
			<CommandItem
				ref={ref}
				value={value}
				// @ts-ignore - This is a hack to work around the type mismatch
				onSelect={() => handleSelect()}
				className={cn(
					"relative flex h-9 items-center rounded-sm px-2 text-sm text-foreground outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
					className,
				)}
				{...props}
			>
				{children || label}
			</CommandItem>
		);
	},
);

InlineComboboxItem.displayName = "InlineComboboxItem";

// Empty component
const InlineComboboxEmpty = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
	return (
		<CommandEmpty
			ref={ref}
			className={cn("py-6 text-center text-sm", className)}
			{...props}
		>
			{children}
		</CommandEmpty>
	);
});

InlineComboboxEmpty.displayName = "InlineComboboxEmpty";

// Group component
const InlineComboboxGroup = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
	return (
		<CommandGroup
			ref={ref}
			className={cn("py-1.5 not-last:border-b", className)}
			{...props}
		>
			{children}
		</CommandGroup>
	);
});

InlineComboboxGroup.displayName = "InlineComboboxGroup";

// Group label component
const InlineComboboxGroupLabel = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
	return (
		<div
			ref={ref}
			className={cn(
				"mt-1.5 mb-2 px-3 text-xs font-medium text-muted-foreground",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
});

InlineComboboxGroupLabel.displayName = "InlineComboboxGroupLabel";

export {
	InlineCombobox,
	InlineComboboxContent,
	InlineComboboxEmpty,
	InlineComboboxGroup,
	InlineComboboxGroupLabel,
	InlineComboboxInput,
	InlineComboboxItem,
	InlineComboboxTrigger,
	useInlineCombobox,
};
