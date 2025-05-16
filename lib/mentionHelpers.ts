import {
	Editor,
	Transforms,
	Path,
	Element as SlateElement,
	type Node,
} from "slate";

import { ReactEditor } from "slate-react";
import type {
	CustomEditor,
	StarWarsMentionElement,
	CustomText,
} from "@/types/editorTypes";

export const insertMentionAtPlaceholder = (
	editor: CustomEditor,
	mention: StarWarsMentionElement,
): void => {
	try {
		const [placeholderEntry] = Editor.nodes(editor, {
			match: (n) =>
				SlateElement.isElement(n) && n.type === "mention-placeholder",
		});
		if (placeholderEntry) {
			const [, path] = placeholderEntry;
			Transforms.removeNodes(editor, { at: path });
			Transforms.insertNodes(editor, mention as Node, { at: path });
			const after = Editor.after(editor, path);
			if (after) {
				Transforms.select(editor, after);
			} else {
				const end = Editor.end(editor, []);
				Transforms.insertNodes(editor, { text: " " }, { at: end });
				Transforms.select(editor, Editor.after(editor, end) || end);
			}
			ReactEditor.focus(editor);
			setTimeout(() => ReactEditor.focus(editor), 10);
		} else {
			Transforms.insertNodes(editor, mention as Node);
			Transforms.move(editor);
			ReactEditor.focus(editor);
		}
	} catch (err) {
		Transforms.insertNodes(editor, mention as Node);
		Transforms.move(editor);
		ReactEditor.focus(editor);
	}
};

export const applyInlineFormat = (
	editor: CustomEditor,
	path: number[],
	text: string,
	match: RegExpExecArray,
	formatProp: keyof CustomText,
	markerLength: number,
): void => {
	try {
		const start = match.index;
		const end = start + match[0].length;
		const content = match[1];
		const beforeText = text.slice(0, start);
		const afterText = text.slice(end);
		let currentOffset: number | null = null;

		// Check if the selection path is valid
		try {
			if (editor.selection && Path.equals(editor.selection.anchor.path, path)) {
				currentOffset = editor.selection.anchor.offset;
			}
		} catch (e) {
			console.error("Error checking selection path:", e);
			// Continue without selection tracking
		}

		let wasFocused = false;
		try {
			wasFocused = ReactEditor.isFocused(editor);
		} catch (e) {
			console.error("Error checking focus:", e);
		}

		const parentPath = Path.parent(path);
		const index = path[path.length - 1];

		Editor.withoutNormalizing(editor, () => {
			try {
				Transforms.removeNodes(editor, { at: path });
				const newNodes: Node[] = [];
				if (beforeText) newNodes.push({ text: beforeText });
				newNodes.push({ text: content, [formatProp]: true } as CustomText);
				if (afterText) newNodes.push({ text: afterText });

				try {
					Transforms.insertNodes(editor, newNodes, {
						at: parentPath.concat(index),
					});
				} catch (insertError) {
					console.error("Error inserting nodes:", insertError);
					// Try to restore original content if insertion fails
					try {
						Transforms.insertNodes(editor, [{ text }], {
							at: parentPath.concat(index),
						});
					} catch (restoreError) {
						console.error("Error restoring original content:", restoreError);
					}
					return;
				}

				if (currentOffset !== null) {
					try {
						let newPath: number[];
						let newOffset: number;
						if (currentOffset <= beforeText.length) {
							newPath = parentPath.concat(index);
							newOffset = currentOffset;
						} else if (currentOffset <= beforeText.length + match[0].length) {
							newPath = parentPath.concat(index + (beforeText ? 1 : 0));
							newOffset = currentOffset - beforeText.length - markerLength;
							newOffset = Math.max(0, Math.min(newOffset, content.length));
						} else {
							newPath = parentPath.concat(index + (beforeText ? 2 : 1));
							newOffset = currentOffset - (beforeText.length + match[0].length);
						}

						// Check if the path exists before selecting
						try {
							Editor.node(editor, newPath);
							Transforms.select(editor, { path: newPath, offset: newOffset });
						} catch (selectError) {
							console.error("Error selecting after format:", selectError);
						}
					} catch (pathError) {
						console.error("Error calculating new selection path:", pathError);
					}
				}

				if (wasFocused) {
					try {
						ReactEditor.focus(editor);
					} catch (focusError) {
						console.error("Error focusing editor:", focusError);
					}
				}
			} catch (error) {
				console.error("Error applying inline format:", error);
			}
		});
	} catch (outerError) {
		console.error("Critical error in applyInlineFormat:", outerError);
	}
};
