import {
	type Value,
	NodeApi,
	TextApi,
	ElementApi,
	type Descendant,
} from "@udecode/plate";
import type { PlateEditor } from "@udecode/plate/react";

/**
 * Counts the total text length in a Plate editor content.
 * This function recursively traverses the document tree and counts all text characters.
 *
 * @param content - The Plate editor content (Value) to analyze
 * @returns The total character count
 */
export function getPlateContentLength(content: Value): number {
	if (!content || !Array.isArray(content) || content.length === 0) {
		return 0;
	}

	let totalLength = 0;

	// Recursively process each node in the content
	function processNode(node: Descendant): void {
		// If it's a text node, add its text length
		if (TextApi.isText(node)) {
			totalLength += (node.text || "").length;
			return;
		}

		// If it's an element with children, process each child
		if (ElementApi.isElement(node) && Array.isArray(node.children)) {
			for (const child of node.children) {
				processNode(child);
			}
		}
	}

	// Process each top-level node
	for (const node of content) {
		processNode(node);
	}

	return totalLength;
}

/**
 * Counts the total text length in a Plate editor instance.
 *
 * @param editor - The Plate editor instance
 * @returns The total character count
 */
export function getEditorContentLength(editor: PlateEditor): number {
	if (!editor) {
		return 0;
	}

	return getPlateContentLength(editor.children as Value);
}

/**
 * Gets a plain text representation of Plate content.
 *
 * @param content - The Plate editor content
 * @returns A plain text string
 */
export function getPlainTextFromContent(content: Value): string {
	if (!content || !Array.isArray(content) || content.length === 0) {
		return "";
	}

	// Use NodeApi.string to convert content to plain text
	return NodeApi.string({
		children: content,
		type: "root",
	});
}
