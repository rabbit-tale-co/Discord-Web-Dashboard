"use client";

import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
} from "@/components/ui/form";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandList,
} from "@/components/ui/command";
import { emojiCategories } from "@/lib/emojis";

// Define types for the emoji items
type EmojiItem = { emoji: string; keywords: string };

// Convert all emojis to objects with consistent structure
const processedCategories = emojiCategories.map((category) => ({
	name: category.name,
	emojis: category.emojis.map((item) =>
		typeof item === "string" ? { emoji: item, keywords: item } : item,
	) as EmojiItem[],
}));

// Create a flat array of all emojis with their category
const allEmojis = processedCategories.flatMap((category) =>
	category.emojis.map((item) => ({
		emoji: item.emoji,
		keywords: item.keywords,
		category: category.name,
	})),
);

type EmojiFieldProps = {
	name: string;
	label: string;
	description?: string;
	allowNone?: boolean;
};

export function EmojiField({
	name,
	label,
	description,
	allowNone = false,
}: EmojiFieldProps) {
	const form = useFormContext();
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem>
					<FormLabel>{label}</FormLabel>
					{description && <FormDescription>{description}</FormDescription>}
					<FormControl>
						<Popover open={open} onOpenChange={setOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									className={cn(
										"w-full justify-between rounded-md",
										!field.value && "text-muted-foreground",
									)}
								>
									<span className="flex items-center">
										{field.value ? (
											<React.Fragment>
												<span className="mr-2 text-xl">{field.value}</span>
												<span>Selected Emoji</span>
											</React.Fragment>
										) : (
											"Select emoji"
										)}
									</span>
									<ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								align="start"
								className="p-0 w-[300px]"
								side="bottom"
								sideOffset={8}
							>
								<Command className="w-full">
									<CommandInput
										placeholder="Search emoji..."
										value={inputValue}
										onValueChange={setInputValue}
									/>
									<CommandList className="max-h-[300px] overflow-y-auto">
										{inputValue ? (
											<div className="py-1">
												<div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
													Search Results
												</div>
												<div className="grid grid-cols-8 gap-1 p-3 py-2">
													{(() => {
														const searchTerm = inputValue.toLowerCase().trim();

														if (!searchTerm) return null;

														const matches = allEmojis.filter(
															(item) =>
																item.emoji.includes(searchTerm) ||
																item.keywords
																	.toLowerCase()
																	.includes(searchTerm),
														);

														if (matches.length === 0) {
															return (
																<CommandEmpty className="col-span-8 p-4 text-sm text-center text-muted-foreground">
																	No matching emojis found for `&quot;`
																	{inputValue}`&quot;`
																</CommandEmpty>
															);
														}

														return matches.slice(0, 64).map((item, index) => (
															<Button
																key={`search-${item.emoji}-${index}`}
																variant="ghost"
																className="size-8 p-0 text-lg"
																onClick={() => {
																	form.setValue(name, item.emoji);
																	form.trigger(name);
																	setInputValue("");
																	setOpen(false);
																}}
															>
																{item.emoji}
															</Button>
														));
													})()}
												</div>
											</div>
										) : (
											processedCategories.map((category) => (
												<CommandGroup
													key={category.name}
													heading={category.name}
												>
													<div className="grid grid-cols-8 gap-1 p-2">
														{category.emojis.map((item, index) => (
															<Button
																key={`${category.name}-${item.emoji}-${index}`}
																variant="ghost"
																size="icon"
																className="size-8 p-0 text-lg"
																onClick={() => {
																	form.setValue(name, item.emoji);
																	form.trigger(name);
																	setOpen(false);
																}}
															>
																{item.emoji}
															</Button>
														))}
													</div>
												</CommandGroup>
											))
										)}
										{allowNone && (
											<CommandGroup heading="Options">
												<div className="p-2">
													<Button
														variant="outline"
														className="w-full"
														onClick={() => {
															form.setValue(name, "");
															form.trigger(name);
															setInputValue("");
															setOpen(false);
														}}
													>
														None - disabled
													</Button>
												</div>
											</CommandGroup>
										)}
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
