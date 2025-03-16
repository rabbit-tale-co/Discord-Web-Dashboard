"use client";

import { useState, useEffect, useRef } from "react";
import { useEditorRef, useEditorVersion } from "@udecode/plate/react";
import {
	getEditorContentLength,
	getPlainTextFromContent,
} from "./content-utils";
import type { Value } from "@udecode/plate";

// Enhanced debounce function with cancel support
function debounce<T extends (...args: unknown[]) => void>(
	func: T,
	wait: number,
): {
	(...args: Parameters<T>): void;
	cancel: () => void;
} {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	const debounced = (...args: Parameters<T>) => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => {
			func(...args);
		}, wait);
	};

	debounced.cancel = () => {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
	};

	return debounced;
}

/**
 * Custom hook to track Plate editor content length with additional utilities.
 * Optimized for performance during fast typing.
 *
 * @param options Configuration options for the hook
 * @returns Object containing content length info and utility functions
 */
export function usePlateContentLength({
	editorId,
	maxLength,
	onChange,
	debounceDelay = 500,
}: {
	/**
	 * Optional editor ID to track (uses default editor if not specified)
	 */
	editorId?: string;

	/**
	 * Optional maximum character limit
	 */
	maxLength?: number;

	/**
	 * Optional callback when content length changes
	 */
	onChange?: (info: PlateContentLengthInfo) => void;

	/**
	 * Debounce delay in milliseconds (default: 500ms)
	 */
	debounceDelay?: number;
}) {
	// Get references to the editor
	const editor = useEditorRef(editorId);
	// Use editor version to track changes
	const editorVersion = useEditorVersion(editorId);

	// Track if we're currently typing to avoid frequent updates
	const isTypingRef = useRef(false);
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Store the debounced function in a ref
	const debouncedUpdateRef = useRef<ReturnType<
		typeof debounce<() => void>
	> | null>(null);

	// Track the editor version for dependency tracking
	const editorVersionRef = useRef(editorVersion);

	// Update the ref when version changes
	useEffect(() => {
		editorVersionRef.current = editorVersion;

		// Don't trigger updates here - we'll handle that in a separate effect
	}, [editorVersion]);

	// Track content length info
	const [lengthInfo, setLengthInfo] = useState<PlateContentLengthInfo>({
		contentLength: 0,
		plainText: "",
		isExceeded: false,
		remaining: maxLength ?? 0,
		percentage: 0,
	});

	// Create the debounced update function
	useEffect(() => {
		if (!editor) return;

		// Create the update function
		const updateLengthInfo = () => {
			// Skip updates if we're actively typing
			if (isTypingRef.current) return;

			const contentLength = getEditorContentLength(editor);
			const plainText = getPlainTextFromContent(editor.children as Value);
			const isExceeded = maxLength ? contentLength > maxLength : false;
			const remaining = maxLength ? maxLength - contentLength : 0;
			const percentage = maxLength
				? Math.min(100, Math.floor((contentLength / maxLength) * 100))
				: 0;

			const newInfo = {
				contentLength,
				plainText,
				isExceeded,
				remaining,
				percentage,
			};

			setLengthInfo(newInfo);
			onChange?.(newInfo);
		};

		// Create the debounced version
		debouncedUpdateRef.current = debounce(updateLengthInfo, debounceDelay);

		// Initial calculation (not debounced)
		updateLengthInfo();

		// Cleanup
		return () => {
			if (debouncedUpdateRef.current) {
				debouncedUpdateRef.current.cancel();
			}

			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
		};
	}, [editor, maxLength, onChange, debounceDelay]);

	// Set up a single effect to watch for changes and update
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		// Skip if we don't have editor or debounced update function
		if (!editor || !debouncedUpdateRef.current) return;

		// When editor version changes, mark as typing
		isTypingRef.current = true;

		// Clear previous timeout
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}

		typingTimeoutRef.current = setTimeout(() => {
			isTypingRef.current = false;
			// Update once typing has stopped
			if (debouncedUpdateRef.current) {
				debouncedUpdateRef.current();
			}
		}, debounceDelay);

		// Cleanup
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
		};
	}, [editor, editorVersion]); // Include editorVersion to detect changes

	// Helper function to get clipboard-ready plain text
	const getPlainText = () => {
		if (!editor) return "";
		return getPlainTextFromContent(editor.children as Value);
	};

	return {
		...lengthInfo,
		getPlainText,
	};
}

/**
 * Information about the content length
 */
export interface PlateContentLengthInfo {
	/**
	 * Total character count
	 */
	contentLength: number;

	/**
	 * Plain text representation
	 */
	plainText: string;

	/**
	 * Whether content exceeds max length
	 */
	isExceeded: boolean;

	/**
	 * Remaining characters (if maxLength is set)
	 */
	remaining: number;

	/**
	 * Percentage of maxLength used (0-100)
	 */
	percentage: number;
}
