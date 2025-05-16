import {
	Editor,
	Transforms,
	Range,
	Text,
	Path,
	Element as SlateElement,
	type Node as SlateNode,
} from "slate";
import { ReactEditor } from "slate-react";
import type { CustomEditor } from "@/types/editorTypes";
import { applyInlineFormat } from "@/lib/mentionHelpers";

export const withMentions = (editor: CustomEditor): CustomEditor => {
	const { isInline, isVoid, normalizeNode, insertText } = editor;

	editor.insertText = (text: string) => {
		const { selection } = editor;
		if (text !== " " || !selection || !Range.isCollapsed(selection)) {
			insertText(text);
			return;
		}

		try {
			const [node] = Editor.node(editor, selection);
			if (!Text.isText(node)) {
				insertText(text);
				return;
			}

			const { anchor } = selection;

			// Safety check: ensure the path exists and is valid
			try {
				// Check if the path is valid
				Editor.node(editor, anchor.path);
			} catch (e: unknown) {
				// If path is invalid, just insert text normally
				insertText(text);
				return;
			}

			let start: { path: number[]; offset: number };
			try {
				start = Editor.start(editor, anchor.path);
			} catch (e: unknown) {
				// If we can't get the start, just insert text normally
				console.error("Error getting start point:", e);
				insertText(text);
				return;
			}

			// Get text before cursor
			let textBefore: string;
			try {
				textBefore = Editor.string(editor, { anchor: start, focus: anchor });
			} catch (e) {
				// If we can't get text before, just insert text normally
				console.error("Error getting text before:", e);
				insertText(text);
				return;
			}

			const patterns = [
				{
					pattern: /\*\*([^*]+)\*\*$/,
					formatProp: "bold" as const,
					markerLength: 2,
				},
				{
					pattern: /~~([^~]+)~~$/,
					formatProp: "strikethrough" as const,
					markerLength: 2,
				},
				{
					pattern: /__([^_]+)__$/,
					formatProp: "underline" as const,
					markerLength: 2,
				},
			];
			for (const { pattern, formatProp, markerLength } of patterns) {
				const match = pattern.exec(textBefore);
				if (match) {
					applyInlineFormat(
						editor,
						anchor.path,
						textBefore,
						match,
						formatProp,
						markerLength,
					);
					Transforms.insertText(editor, " ");
					return;
				}
			}

			const spoilerMatch = textBefore.match(/\|\|([^|]+)\|\|$/);
			if (spoilerMatch) {
				Transforms.delete(editor, {
					at: {
						anchor: {
							path: anchor.path,
							offset: anchor.offset - spoilerMatch[0].length,
						},
						focus: anchor,
					},
				});
				Transforms.insertNodes(editor, {
					type: "spoiler" as const,
					children: [{ text: spoilerMatch[1] }],
				});
				Transforms.insertText(editor, " ");
				return;
			}
			insertText(text);
		} catch (error) {
			// If any unexpected error occurs, fall back to default behavior
			console.error("Error in insertText:", error);
			insertText(text);
		}
	};

	editor.isInline = (element) =>
		SlateElement.isElement(element) &&
		(element.type === "mention" ||
			element.type === "mention-placeholder" ||
			element.type === "spoiler")
			? true
			: isInline(element);

	editor.isVoid = (element) =>
		SlateElement.isElement(element) &&
		(element.type === "mention" ||
			element.type === "mention-placeholder" ||
			element.type === "spoiler")
			? true
			: isVoid(element);

	editor.markableVoid = (element) =>
		SlateElement.isElement(element) &&
		(element.type === "mention" ||
			element.type === "mention-placeholder" ||
			element.type === "spoiler");

	editor.normalizeNode = (entry) => {
		try {
			const [node, path] = entry;
			normalizeNode(entry);
			if (!Text.isText(node) || node.text === "") return;

			const text = node.text;
			const spoilerPattern = /\|\|([^|]+?)\|\|/;
			const spoilerMatch = spoilerPattern.exec(text);
			if (spoilerMatch) {
				try {
					const parentEntry = Editor.parent(editor, path);
					const [parentNode] = parentEntry;
					if (editor.isVoid(parentNode)) return;

					const startIndex = spoilerMatch.index;
					const endIndex = startIndex + spoilerMatch[0].length;
					const spoilerContent = spoilerMatch[1];
					const beforeText = text.slice(0, startIndex);
					const afterText = text.slice(endIndex);
					let currentOffset: number | null = null;
					if (
						editor.selection &&
						Path.equals(editor.selection.anchor.path, path)
					) {
						currentOffset = editor.selection.anchor.offset;
					}
					const wasFocused = ReactEditor.isFocused(editor);
					const parentPath = Path.parent(path);
					const index = path[path.length - 1];

					Editor.withoutNormalizing(editor, () => {
						try {
							Transforms.removeNodes(editor, { at: path });
							const newNodes = [];
							if (beforeText) newNodes.push({ text: beforeText });
							newNodes.push({
								type: "spoiler" as const,
								children: [{ text: spoilerContent }],
							});
							if (afterText) newNodes.push({ text: afterText });
							Transforms.insertNodes(editor, newNodes as SlateNode[], {
								at: parentPath.concat(index),
							});

							if (currentOffset !== null && editor.selection) {
								try {
									const { anchor } = editor.selection;
									let newPath: number[];
									let newOffset: number;
									if (currentOffset <= beforeText.length) {
										newPath = parentPath.concat(index);
										newOffset = currentOffset;
									} else if (
										currentOffset <=
										beforeText.length + spoilerMatch[0].length
									) {
										const afterSpoilerIndex = beforeText ? index + 1 : index;
										newPath = parentPath.concat(afterSpoilerIndex + 1);
										newOffset = 0;
									} else {
										const afterTextIndex = beforeText ? index + 2 : index + 1;
										newPath = parentPath.concat(afterTextIndex);
										newOffset =
											currentOffset -
											(beforeText.length + spoilerMatch[0].length);
									}

									try {
										const [nodeAtPath] = Editor.node(editor, newPath);
										if (Text.isText(nodeAtPath)) {
											Transforms.select(editor, {
												path: newPath,
												offset: newOffset,
											});
										} else {
											const after = Editor.after(editor, newPath);
											if (after) Transforms.select(editor, after);
										}
									} catch (e) {
										// If there's an error with this node, try to select the end of the document
										const end = Editor.end(editor, []);
										Transforms.select(editor, end);
									}
								} catch (e) {
									console.error("Error selecting after normalizing:", e);
								}
							}

							if (wasFocused) {
								try {
									ReactEditor.focus(editor);
								} catch (e) {
									console.error("Error focusing after normalizing:", e);
								}
							}
						} catch (e) {
							console.error("Error normalizing spoiler:", e);
						}
					});
				} catch (e) {
					console.error("Error processing spoiler:", e);
				}
				return;
			}

			if (editor.selection) {
				try {
					const { anchor } = editor.selection;
					const boldPattern = /\*\*([^*]+?)\*\*/;
					const boldMatch = boldPattern.exec(text);
					if (boldMatch && !node.bold) {
						applyInlineFormat(editor, anchor.path, text, boldMatch, "bold", 2);
						return;
					}
					const strikePattern = /~~([^~]+?)~~/;
					const strikeMatch = strikePattern.exec(text);
					if (strikeMatch && !node.strikethrough) {
						applyInlineFormat(
							editor,
							anchor.path,
							text,
							strikeMatch,
							"strikethrough",
							2,
						);
						return;
					}
					const underlinePattern = /__([^_]+?)__/;
					const underlineMatch = underlinePattern.exec(text);
					if (underlineMatch && !node.underline) {
						applyInlineFormat(
							editor,
							anchor.path,
							text,
							underlineMatch,
							"underline",
							2,
						);
						return;
					}
				} catch (e) {
					console.error("Error applying format:", e);
				}
			}
		} catch (e) {
			console.error("Error in normalizeNode:", e);
		}
		return;
	};

	return editor;
};
