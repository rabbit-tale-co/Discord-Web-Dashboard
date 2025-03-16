"use client";

import React, { useState, useEffect } from "react";
import { useEditorRef, useEditorVersion } from "@udecode/plate/react";
import {
	getEditorContentLength,
	getPlainTextFromContent,
} from "./content-utils";

interface PlateContentLengthProps {
	/**
	 * Maximum allowed character count (optional)
	 */
	maxLength?: number;

	/**
	 * Whether to show remaining characters (true) or used characters (false)
	 */
	showRemaining?: boolean;

	/**
	 * Message to show when content exceeds the maximum length
	 */
	errorMessage?: string;

	/**
	 * Editor ID to use (optional, will use default if not provided)
	 */
	editorId?: string;

	/**
	 * Custom className for the counter display
	 */
	className?: string;
}

export function PlateContentLength({
	maxLength,
	showRemaining = false,
	errorMessage = "Content exceeds maximum length",
	editorId,
	className,
}: PlateContentLengthProps) {
	// Get the editor instance
	const editor = useEditorRef(editorId);
	// Track editor version to detect changes
	const editorVersion = useEditorVersion(editorId);

	// State to track content length
	const [contentLength, setContentLength] = useState(0);
	const [isExceeded, setIsExceeded] = useState(false);

	// Update content length when editor content changes
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		if (!editor) return;

		// Calculate current length
		const length = getEditorContentLength(editor);
		setContentLength(length);

		// Check if exceeds max length
		if (maxLength) {
			setIsExceeded(length > maxLength);
		}
	}, [editor, editorVersion, maxLength]);

	// Position styling for the counter
	const positionClassName = "absolute bottom-2 right-2";

	return (
		<div
			className={`text-xs ${positionClassName} ${isExceeded ? "text-red-500" : "text-muted-foreground"} ${className || ""}`}
		>
			{maxLength ? (
				<React.Fragment>
					{contentLength}/{maxLength}
				</React.Fragment>
			) : (
				contentLength
			)}
		</div>
	);
}

export function usePlateContentLength(editorId?: string): {
	contentLength: number;
	plainText: string;
	isExceeded: boolean;
} {
	const editor = useEditorRef(editorId);
	const editorVersion = useEditorVersion(editorId);
	const [state, setState] = useState({
		contentLength: 0,
		plainText: "",
		isExceeded: false,
	});

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		if (!editor) return;

		const contentLength = getEditorContentLength(editor);
		const plainText = getPlainTextFromContent(editor.children);
		const maxLength = editor.maxLength as number | undefined;
		const isExceeded = maxLength ? contentLength > maxLength : false;

		setState({
			contentLength,
			plainText,
			isExceeded,
		});
	}, [editor, editorVersion]);

	return state;
}
