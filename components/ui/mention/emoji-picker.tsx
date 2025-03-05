/**
 * EmojiPicker Component
 *
 * A reusable emoji picker component that can be used in various text inputs.
 */

import React from "react";
import { SmileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

export interface EmojiCategory {
	name: string;
	emojis: Array<string | { emoji: string; keywords: string }>;
}

export interface ProcessedCategory {
	name: string;
	emojis: Array<{ emoji: string; keywords: string }>;
}

interface EmojiPickerProps {
	onEmojiSelect: (emoji: string) => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	emojiCategories: Record<string, string[]>;
	popularEmojis?: string[];
	buttonClassName?: string;
	align?: "start" | "center" | "end";
	side?: "top" | "right" | "bottom" | "left";
}

export function EmojiPicker({
	onEmojiSelect,
	open,
	onOpenChange,
	emojiCategories,
	popularEmojis = ["👍", "❤️", "😊", "🙏", "👏", "🎉", "👋", "🔥", "✨", "😂"],
	buttonClassName,
	align = "end",
	side = "top",
}: EmojiPickerProps) {
	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={cn("size-8", buttonClassName)}
					data-emoji-button="true"
				>
					<SmileIcon className="size-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="p-0" side={side} align={align}>
				<Command className="w-[320px]">
					<CommandInput placeholder="Search emoji..." className="h-9" />
					<CommandList className="max-h-[300px]">
						<CommandEmpty>No emoji found</CommandEmpty>
						<CommandGroup>
							{/* Popular emojis section */}
							<div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
								Popular
							</div>
							<div className="grid grid-cols-8 gap-1 p-2">
								{popularEmojis.map((emoji) => (
									<Button
										key={emoji}
										variant="ghost"
										size="icon"
										className="size-8 p-0 hover:bg-muted"
										onClick={() => onEmojiSelect(emoji)}
									>
										<span className="text-lg">{emoji}</span>
									</Button>
								))}
							</div>

							{/* Categories */}
							{Object.entries(emojiCategories).map(([category, emojis]) => (
								<React.Fragment key={category}>
									<div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
										{category}
									</div>
									<div className="grid grid-cols-8 gap-1 p-2">
										{emojis.slice(0, 24).map((emoji) => (
											<Button
												key={`${category}-${emoji}`}
												variant="ghost"
												size="icon"
												className="size-8 p-0 hover:bg-muted"
												onClick={() => onEmojiSelect(emoji)}
											>
												<span className="text-lg">{emoji}</span>
											</Button>
										))}
									</div>
								</React.Fragment>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
