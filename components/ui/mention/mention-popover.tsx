/**
 * MentionPopover Component
 *
 * A popover component for selecting mentions (roles, channels, or variables).
 * This component handles displaying and filtering available options.
 */

import React, { useRef, useCallback } from "react";
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
import { getEditorInstance, type MentionType } from "./mention-textarea-base";
import { Editor, Transforms, Element as SlateElement } from "slate";
import { ReactEditor } from "slate-react";

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
}: MentionPopoverProps) {
	// Reference to the command input
	const commandInputRef = useRef<HTMLInputElement>(null);

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
		if (!open) return;

		// Remove any placeholder mentions
		const editor = getEditorInstance("mention-textarea");
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

				// If there are any placeholders, remove them
				if (placeholders.length > 0) {
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
				}

				// Focus the editor
				setTimeout(() => {
					try {
						ReactEditor.focus(editor);
					} catch (e) {
						console.error("Error focusing editor:", e);
						const editorElement = document.querySelector('[role="textbox"]');
						if (editorElement instanceof HTMLElement) {
							editorElement.focus();
						}
					}
				}, 0);
			} catch (error) {
				console.error("Error removing placeholder:", error);
			}
		}
	}, [open]);

	// Group variables by category
	const groupedVariables = React.useMemo(() => {
		const result: Record<string, Variable[]> = {};

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

		return result;
	}, [variables, categories]);

	// Get all categories that have variables
	const allCategories = React.useMemo(() => {
		const categoriesWithVariables = new Set(variables.map((v) => v.category));
		return categories.filter((c) => categoriesWithVariables.has(c.name));
	}, [variables, categories]);

	if (!anchor) return null;

	return (
		<Popover
			open={open}
			onOpenChange={(open) => {
				onOpenChange(open);
				if (!open) {
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
				className="p-0 w-[220px] bg-white border border-gray-300 shadow-md rounded-md"
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
											onMentionSelect(
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
											onMentionSelect(
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
														onMentionSelect(
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
