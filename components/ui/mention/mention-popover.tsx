/**
 * MentionPopover Component
 *
 * A popover component for selecting mentions (roles, channels, or variables).
 * This component handles displaying and filtering available options.
 */

import React, { useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Command,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandInput,
} from "@/components/ui/command";
import type { MentionType } from "./mention-textarea-base";
import { Editor, Transforms, Element as SlateElement } from "slate";
import { ReactEditor } from "slate-react";
import { getEditorInstance } from "../textarea";

// Typing for role and channel data
export interface Role {
	id: string;
	name: string;
	color?: number;
}

export interface Channel {
	id: string;
	name: string;
	type?: number;
}

export interface Variable {
	id: string;
	name: string;
	description?: string;
	example?: string;
	category: string;
}

export interface Category {
	id: string;
	name: string;
	icon: string;
}

export interface MentionAnchor {
	x: number;
	y: number;
}

interface MentionPopoverProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	anchor: MentionAnchor | null;
	mentionType: MentionType;
	searchValue: string;
	onSearchChange: (value: string) => void;
	savedRange: Range | null;
	roles: Role[];
	channels: Channel[];
	variables: Variable[];
	categories: Category[];
	editorId?: string;
	onMentionSelect: (
		type: MentionType,
		item: { id: string; name: string } | { name: string },
		range?: Range,
	) => void;
}

export function MentionPopover({
	open,
	onOpenChange,
	anchor,
	mentionType,
	searchValue,
	onSearchChange,
	savedRange,
	roles,
	channels,
	variables,
	categories,
	onMentionSelect,
	editorId = "mention-textarea",
}: MentionPopoverProps) {
	// Get guildId from URL params
	const params = useParams();
	const guildId = params.guildId as string;

	// Reference to the command input
	const commandInputRef = useRef<HTMLInputElement>(null);

	// Debug logging
	// console.log("MentionPopover props:", {
	// 	mentionType,
	// 	searchValue,
	// 	variables: variables.length,
	// 	categories: categories.length,
	// 	roles: roles.length,
	// 	channels: channels.length,
	// 	editorId,
	// });

	// Filter roles and channels based on search value
	const filteredRoles = roles.filter((role) =>
		role.name.toLowerCase().includes(searchValue.toLowerCase()),
	);

	const filteredChannels = channels.filter(
		(channel) =>
			channel.type === 0 &&
			channel.name.toLowerCase().includes(searchValue.toLowerCase()),
	);

	// Handle popover close
	const handlePopoverClose = useCallback(() => {
		// Log the close event for debugging
		// console.log("Handling popover close for editorId:", editorId);

		// Używamy requestAnimationFrame, aby upewnić się, że
		// poniższy kod wykona się po zakończeniu bieżącego cyklu renderowania
		requestAnimationFrame(() => {
			// Remove any placeholder mentions
			const editor = getEditorInstance(editorId);
			if (editor) {
				try {
					// Find and remove any mention placeholders in the document
					const placeholders = Array.from(
						Editor.nodes(editor, {
							at: [],
							match: (n) =>
								SlateElement.isElement(n) &&
								"type" in n &&
								n.type === "mention-placeholder",
						}),
					);

					// console.log(
					// 	`Found placeholders to remove in editorId ${editorId}:`,
					// 	placeholders.length,
					// );

					// If there are any placeholders, remove them
					if (placeholders.length > 0) {
						// Najpierw upewnij się, że edytor ma focus
						try {
							ReactEditor.focus(editor);
						} catch (e) {
							console.error(
								`Error focusing editor ${editorId} before removal:`,
								e,
							);
						}

						// Teraz usuń placeholdery
						for (const [_, placeholderPath] of placeholders) {
							// Remove the placeholder
							Transforms.removeNodes(editor, {
								at: placeholderPath,
								match: (n) =>
									SlateElement.isElement(n) &&
									"type" in n &&
									n.type === "mention-placeholder",
							});
						}

						// Focus the editor again after a slightly longer delay
						// to upewnić się, że focus pozostaje na edytorze
						setTimeout(() => {
							try {
								// console.log(
								// 	`Attempting to focus editor ${editorId} after placeholder removal`,
								// );
								ReactEditor.focus(editor);

								// Dodatkowe zabezpieczenie - ustawienie kursora na końcu edytora
								// co zapobiega "przeskakiwaniu" fokusu do następnego elementu
								const point = Editor.end(editor, []);
								Transforms.select(editor, point);
							} catch (e) {
								console.error(`Error focusing editor ${editorId}:`, e);
								// Fallback dla sytuacji, gdy normalny focus nie zadziała
								const editorElement = document.querySelector(
									`[data-editor-id="${editorId}"]`,
								);
								if (editorElement instanceof HTMLElement) {
									editorElement.focus();
								} else {
									// Ostateczny fallback - znajdź dowolny element edytora tekstowego
									const anyTextbox = document.querySelector('[role="textbox"]');
									if (anyTextbox instanceof HTMLElement) {
										anyTextbox.focus();
									}
								}
							}
						}, 50); // Dłuższy timeout niż 0
					}
				} catch (error) {
					console.error(
						`Error removing placeholder from editor ${editorId}:`,
						error,
					);
				}
			}
		});
	}, [editorId]);

	// Group variables by category
	const groupedVariables = React.useMemo(() => {
		const result: Record<string, Variable[]> = {};

		// Debug logging
		// console.log("Grouping variables:", {
		// 	variables,
		// 	categories,
		// 	mentionType,
		// });

		// Initialize categories from the categories prop
		for (const category of categories) {
			result[category.name] = [];
		}

		// Group variables by their category
		for (const variable of variables) {
			if (!result[variable.category]) {
				result[variable.category] = [];
			}
			result[variable.category].push(variable);
		}

		// console.log("Grouped variables result:", result);

		return result;
	}, [variables, categories, mentionType]);

	// Get all categories that have variables
	const allCategories = React.useMemo(() => {
		const categoriesWithVariables = new Set(variables.map((v) => v.category));
		const filteredCategories = categories.filter((c) =>
			categoriesWithVariables.has(c.name),
		);

		// console.log("Categories with variables:", {
		// 	categoriesWithVariables: Array.from(categoriesWithVariables),
		// 	filteredCategories,
		// });

		return filteredCategories;
	}, [variables, categories]);

	// Obsługa wyboru wzmianki z popovera
	const handleMentionSelect = useCallback(
		(
			type: MentionType,
			item: { id: string; name: string } | { name: string },
			range?: Range,
		) => {
			// Zamykanie popovera
			onOpenChange(false);

			// Usuwanie placeholderu, jeśli istnieje
			if (editorId) {
				const instance = getEditorInstance(editorId);
				if (instance) {
					try {
						// Znajdź placeholder, jeśli istnieje
						const placeholder = Array.from(
							Editor.nodes(instance, {
								at: [],
								match: (n) =>
									SlateElement.isElement(n) && n.type === "mention-placeholder",
							}),
						);

						if (placeholder.length > 0) {
							// Usuń placeholdery
							for (const [_, path] of placeholder) {
								Transforms.removeNodes(instance, { at: path });
							}
						}
					} catch (error) {
						console.error(
							`Error removing placeholder from editor ${editorId}:`,
							error,
						);
					}
				}
			}

			// Formatowanie wartości wzmianki w zależności od typu
			if (type === "role" && "id" in item) {
				// Wywołujemy z bezpośrednim ID roli w formacie <@&ID>
				onMentionSelect(type, item, range);
			} else if (type === "channel" && "id" in item) {
				// Wywołujemy z bezpośrednim ID kanału
				onMentionSelect(type, item, range);
			} else {
				// Dla pozostałych przypadków przekazujemy element bez zmian
				onMentionSelect(type, item, range);
			}
		},
		[editorId, onMentionSelect, onOpenChange],
	);

	if (!anchor) return null;

	return (
		<Popover
			open={open}
			onOpenChange={(newOpen) => {
				// console.log("Popover open change:", newOpen);
				onOpenChange(newOpen);
				// Wywołaj handlePopoverClose tylko przy zamykaniu, nie przy otwieraniu
				if (!newOpen) {
					handlePopoverClose();
				}
			}}
		>
			<PopoverTrigger asChild>
				<div
					className="h-0 w-0 absolute"
					style={{
						left: anchor.x,
						top: anchor.y,
						position: "fixed",
						zIndex: 9999,
					}}
				>
					<span className="sr-only">Toggle mention popover</span>
				</div>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				sideOffset={5}
				className="p-0 w-[220px] bg-white border border-gray-300 shadow-md rounded-md mentionPopover"
				data-mention-popover="true"
			>
				<Command>
					<CommandInput
						ref={commandInputRef}
						value={searchValue}
						onValueChange={onSearchChange}
						placeholder="Search..."
						className="border-none focus:ring-0"
						autoFocus
					/>
					<CommandList>
						<CommandEmpty>No results found</CommandEmpty>
						<CommandGroup>
							{mentionType === "role" &&
								filteredRoles.map((role) => (
									<CommandItem
										key={role.id}
										value={role.name}
										onSelect={() => {
											handleMentionSelect(
												mentionType,
												role,
												savedRange || undefined,
											);
										}}
									>
										<div className="flex items-center gap-2">
											<div
												className="size-3 rounded-full"
												style={{
													backgroundColor: role.color
														? `#${role.color.toString(16).padStart(6, "0")}`
														: "#99AAB5",
												}}
											/>
											<span>{role.name}</span>
										</div>
									</CommandItem>
								))}

							{mentionType === "channel" &&
								filteredChannels.map((channel) => (
									<CommandItem
										key={channel.id}
										value={channel.name}
										onSelect={() => {
											handleMentionSelect(
												mentionType,
												channel,
												savedRange || undefined,
											);
										}}
									>
										<div className="flex items-center gap-2">
											<span>#</span>
											<span>{channel.name}</span>
										</div>
									</CommandItem>
								))}

							{mentionType === "variable" &&
								allCategories.map((category) => {
									// Get variables for this category and filter them
									const categoryItems =
										groupedVariables[category.name]?.filter((item) => {
											if (!searchValue) return true;
											const searchLower = searchValue.toLowerCase();
											return (
												item.name.toLowerCase().includes(searchLower) ||
												(item.description
													?.toLowerCase()
													.includes(searchLower) ??
													false)
											);
										}) || [];

									// Only render category if it has matching items
									if (categoryItems.length === 0) return null;

									return (
										<React.Fragment key={category.id}>
											<div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
												<span className="mr-2">{category.icon}</span>
												{category.name}
											</div>
											{categoryItems.map((item) => (
												<CommandItem
													key={item.id}
													value={item.name}
													onSelect={() => {
														handleMentionSelect(
															mentionType,
															item,
															savedRange || undefined,
														);
													}}
												>
													<div className="flex flex-col">
														<span className="font-medium">{item.name}</span>
														{item.description && (
															<span className="text-sm text-muted-foreground">
																{item.description}
																{item.example && ` (e.g. ${item.example})`}
															</span>
														)}
													</div>
												</CommandItem>
											))}
										</React.Fragment>
									);
								})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
