import { CommandItem } from "@/components/ui/command";
import { Editor, Transforms, Element as SlateElement } from "slate";
import { ReactEditor } from "slate-react";
import type { Variable } from "@/lib/variables";
import type { MentionElement, VariableMentionElement } from "./types";

interface VariableMentionProps {
	variable: Variable;
	editor: ReactEditor;
	onSelect: () => void;
}

export function VariableMention({
	variable,
	editor,
	onSelect,
}: VariableMentionProps) {
	const handleSelect = () => {
		try {
			const [placeholderEntry] = Editor.nodes(editor, {
				match: (n) =>
					SlateElement.isElement(n) && n.type === "mention-placeholder",
			});

			if (placeholderEntry) {
				const [node, path] = placeholderEntry;

				// Replace the placeholder with mention in a single operation
				Transforms.setNodes<VariableMentionElement>(
					editor,
					{
						type: "mention",
						mentionType: "variable",
						value: variable.id,
						displayValue: variable.name,
						children: [{ text: "" }],
					} as VariableMentionElement,
					{ at: path },
				);

				// Move cursor after the mention
				const after = Editor.after(editor, path);
				if (after) {
					Transforms.select(editor, after);
					ReactEditor.focus(editor);
				}
			} else {
				// If no placeholder found, try to insert at current selection
				console.warn("No placeholder found, inserting at selection");
				Transforms.insertNodes(editor, {
					type: "mention",
					mentionType: "variable",
					value: variable.id,
					displayValue: variable.name,
					children: [{ text: "" }],
				} as VariableMentionElement);
				ReactEditor.focus(editor);
			}
		} catch (err) {
			console.error("Error handling mention selection:", err);
			// Try to clean up any placeholders
			try {
				const [placeholderEntry] = Editor.nodes(editor, {
					match: (n) =>
						SlateElement.isElement(n) && n.type === "mention-placeholder",
				});
				if (placeholderEntry) {
					const [_, path] = placeholderEntry;
					Transforms.removeNodes(editor, { at: path });
				}
			} catch (cleanupErr) {
				console.error("Error cleaning up:", cleanupErr);
			}
		} finally {
			onSelect();
		}
	};

	return (
		<CommandItem onSelect={handleSelect}>
			<div className="flex flex-col">
				<span>{variable.name}</span>
				<span className="text-xs text-muted-foreground">
					{variable.description}
				</span>
			</div>
		</CommandItem>
	);
}
