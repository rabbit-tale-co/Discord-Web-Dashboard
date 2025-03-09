import { CommandItem } from "@/components/ui/command";
import { Editor, Transforms, Element as SlateElement } from "slate";
import { ReactEditor } from "slate-react";
import type { Variable } from "@/lib/variables";

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
				Transforms.setNodes(
					editor,
					{
						type: "mention",
						mentionType: "variable",
						value: `{${variable.id}}`,
						displayValue: variable.name,
						children: [{ text: "" }],
					},
					{ at: path },
				);

				// Move cursor after the mention
				const after = Editor.after(editor, path);
				if (after) {
					Transforms.select(editor, after);
					ReactEditor.focus(editor);
				}
			}
		} catch (err) {
			console.error("Error handling mention selection:", err);
		}
		onSelect();
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
