/**
 * MentionTextarea Component
 *
 * A complete mention-enabled textarea with emoji picker and mention suggestions.
 * This component combines MentionTextareaBase, MentionPopover, and EmojiPicker.
 */

import { useState, useCallback, useRef } from "react";
import { MentionTextareaBase, type MentionType } from "./mention-textarea-base";
import {
	MentionPopover,
	type MentionAnchor,
	type Role,
	type Channel,
	type Variable,
	type Category,
} from "./mention-popover";
import { EmojiPicker } from "./emoji-picker";
import { Editor, Transforms } from "slate";
import { ReactEditor } from "slate-react";
import { getEditorInstance } from "./mention-textarea-base";
import { cn } from "@/lib/utils";

// Add interfaces for node types
interface BaseNode {
	type?: string;
	children?: BaseNode[];
	[key: string]: unknown;
}

export interface MentionTextareaProps {
	placeholder?: string;
	onChange?: (value: string) => void;
	value?: string;
	className?: string;
	maxLength?: number;
	style?: React.CSSProperties;
	singleLine?: boolean;
	rows?: number;
	showEmojiPicker?: boolean;
	showSuggestions?: boolean;
	roles?: Role[];
	channels?: Channel[];
	variables?: Variable[];
	categories?: Category[];
	onFocus?: () => void;
	onBlur?: (e: React.FocusEvent<HTMLElement>) => void;
	emojiCategories?: Record<string, string[]>;
	popularEmojis?: string[];
}

export function MentionTextarea({
	placeholder = "Type your message...",
	onChange,
	value = "",
	className,
	maxLength,
	style,
	singleLine = false,
	rows = 3,
	showEmojiPicker = true,
	showSuggestions = true,
	variables = [],
	categories = [],
	roles = [],
	channels = [],
	onFocus,
	onBlur,
	emojiCategories = {},
	popularEmojis,
}: MentionTextareaProps) {
	// State for mention handling
	const [mentionOpen, setMentionOpen] = useState(false);
	const [mentionAnchor, setMentionAnchor] = useState<MentionAnchor | null>(
		null,
	);
	const [mentionType, setMentionType] = useState<MentionType>("variable");
	const [searchValue, setSearchValue] = useState("");

	// State for tracking emoji picker
	const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
	const [isFieldFocused, setIsFieldFocused] = useState(false);

	// Store the current selection range for mention insertion
	const savedRangeRef = useRef<Range | null>(null);
	const commandInputRef = useRef<HTMLInputElement>(null);

	// Handle mention start
	const handleMentionStart = useCallback(
		(data: { type: MentionType; search: string; domRect: DOMRect }) => {
			if (!showSuggestions) return;

			// Save the position for popover
			setMentionAnchor({
				x: data.domRect.left + 6,
				y: data.domRect.bottom + 6,
			});

			setMentionType(data.type);
			// For variables, don't remove the { character from search
			const cleanSearch =
				data.type === "variable"
					? data.search.replace(/^\{/, "")
					: data.search.replace(/^[@#\{]/, "");
			setSearchValue(cleanSearch);
			setMentionOpen(true);

			// Save the current selection
			const selection = window.getSelection();
			if (selection && selection.rangeCount > 0) {
				savedRangeRef.current = selection.getRangeAt(0).cloneRange();
			}

			// Focus the input after popover opens
			setTimeout(() => {
				if (commandInputRef.current) {
					commandInputRef.current.focus();
				}
			}, 0);
		},
		[showSuggestions],
	);

	// Handle mention end
	const handleMentionEnd = useCallback(() => {
		setMentionOpen(false);
		setMentionAnchor(null);
		savedRangeRef.current = null;
	}, []);

	// Insert mention based on selected item
	const insertMention = useCallback(
		(
			type: MentionType,
			item: { id: string; name: string } | { name: string },
			range?: globalThis.Range,
		) => {
			// Restore the selection if needed
			if (range) {
				try {
					const selection = window.getSelection();
					if (selection) {
						selection.removeAllRanges();
						// Check if range is valid before adding it
						if (range && typeof range === "object" && "cloneRange" in range) {
							selection.addRange(range);
						}
					}
				} catch (error) {
					console.error("Error restoring selection range:", error);
				}
			}

			// Get the value to use for the mention
			const value = "id" in item ? item.id : item.name;

			// Get the Slate editor instance
			const editor = getEditorInstance("mention-textarea");
			if (editor) {
				try {
					// Find and remove any mention placeholder at current selection
					if (editor.selection) {
						// First, we'll get all placeholders in the document
						const placeholders = Array.from(
							Editor.nodes(editor, {
								at: [],
								match: (n) => (n as BaseNode).type === "mention-placeholder",
							}),
						);

						// If there are any placeholders, remove the first one
						if (placeholders.length > 0) {
							const [_, placeholderPath] = placeholders[0];
							// Set selection to the placeholder location
							Transforms.select(editor, placeholderPath);
							// Remove the placeholder
							Transforms.removeNodes(editor, {
								at: placeholderPath,
								match: (n) => (n as BaseNode).type === "mention-placeholder",
							});
						}
					}

					// Prepare the value based on the mention type
					let mentionValue = value;
					if (type === "role") {
						mentionValue = `<@${value}>`;
					} else if (type === "channel") {
						mentionValue = `<#${value}>`;
					} else if (type === "variable") {
						mentionValue = `{${value}}`;
					}

					// Create and insert the mention element with correct typing
					const mentionElement = {
						type: "mention" as const,
						mentionType: type,
						children: [{ text: "" }] as [{ text: "" }],
						value: mentionValue,
					};

					// Insert at the current selection
					Transforms.insertNodes(editor, mentionElement);

					// Move selection after the inserted mention
					Transforms.move(editor, { unit: "offset" });

					// Focus editor
					setTimeout(() => {
						try {
							ReactEditor.focus(editor);
						} catch (e) {
							console.error(
								"Error focusing editor after mention insertion:",
								e,
							);
							const editorElement = document.querySelector('[role="textbox"]');
							if (editorElement instanceof HTMLElement) {
								editorElement.focus();
							}
						}
					}, 10);
				} catch (error) {
					console.error("Error inserting mention:", error);
				}
			}

			// Close the popover
			setMentionOpen(false);
			setMentionAnchor(null);
		},
		[],
	);

	// Handle emoji selection
	const handleEmojiSelect = useCallback((emoji: string) => {
		const editor = getEditorInstance("mention-textarea");
		if (editor) {
			try {
				// Insert the emoji as text
				Transforms.insertText(editor, emoji);

				// Close the emoji picker
				setEmojiPickerOpen(false);

				// Focus back on editor
				setTimeout(() => {
					try {
						ReactEditor.focus(editor);
					} catch (e) {
						console.error("Error focusing editor after emoji insertion:", e);
						const editorElement = document.querySelector('[role="textbox"]');
						if (editorElement instanceof HTMLElement) {
							editorElement.focus();
						}
					}
				}, 10);
			} catch (error) {
				console.error("Error inserting emoji:", error);
			}
		}
	}, []);

	// Handle focus
	const handleFocus = useCallback(() => {
		setIsFieldFocused(true);
		if (onFocus) {
			onFocus();
		}
	}, [onFocus]);

	// Handle blur
	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLElement>) => {
			// Check if click was on emoji button or picker
			const isEmojiButtonClick = e?.relatedTarget?.closest(
				'[data-emoji-button="true"]',
			);
			const isEmojiPickerOpen = e?.relatedTarget?.closest('[role="dialog"]');
			const isEmojiPickerClosing = emojiPickerOpen && !isEmojiPickerOpen;

			// Keep field focused when interacting with emoji picker
			if (isEmojiButtonClick || isEmojiPickerOpen || isEmojiPickerClosing) {
				setIsFieldFocused(true);
				return;
			}

			setIsFieldFocused(false);
			if (onBlur) {
				onBlur(e);
			}
		},
		[emojiPickerOpen, onBlur],
	);

	return (
		<div
			className={cn("relative w-full", singleLine ? "flex items-center" : "")}
		>
			<MentionTextareaBase
				value={value}
				onChange={onChange}
				className={className}
				placeholder={placeholder}
				maxLength={maxLength}
				style={style}
				singleLine={singleLine}
				rows={rows}
				onMentionStart={handleMentionStart}
				onMentionEnd={handleMentionEnd}
				onFocus={handleFocus}
				onBlur={handleBlur}
			/>

			{/* Emoji button */}
			{isFieldFocused && showEmojiPicker && (
				<div
					className={cn(
						"absolute right-2",
						singleLine ? "top-1/2 -translate-y-1/2" : "top-2",
						emojiPickerOpen
							? "text-primary"
							: "text-muted-foreground hover:text-primary",
					)}
				>
					<EmojiPicker
						open={emojiPickerOpen}
						onOpenChange={setEmojiPickerOpen}
						onEmojiSelect={handleEmojiSelect}
						emojiCategories={emojiCategories}
						popularEmojis={popularEmojis}
					/>
				</div>
			)}

			{/* Mention popover */}
			{showSuggestions && (
				<MentionPopover
					open={mentionOpen}
					onOpenChange={setMentionOpen}
					anchor={mentionAnchor}
					mentionType={mentionType}
					searchValue={searchValue}
					onSearchChange={setSearchValue}
					savedRange={savedRangeRef.current}
					roles={roles}
					channels={channels}
					variables={variables}
					categories={categories}
					onMentionSelect={insertMention}
				/>
			)}
		</div>
	);
}
