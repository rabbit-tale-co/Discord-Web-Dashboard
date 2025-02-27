import type React from "react";
import {
	useRef,
	useState,
	useCallback,
	useEffect,
	useLayoutEffect,
} from "react";

import { cn } from "@/lib/utils";
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from "@/components/ui/popover";
import {
	Command,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
} from "@/components/ui/command";
import type {
	SuggestionType,
	Suggestion,
} from "@/components/ui/custom-textarea";
import { getCachedData } from "@/lib/cache";
import type { GuildData } from "@/types/guild";
import type { Channel } from "discord.js";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
				className,
			)}
			{...props}
		/>
	);
}

interface HighlightedTextareaProps
	extends Omit<React.ComponentProps<"div">, "onChange" | "value"> {
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	suggestions?: Suggestion[];
	guildId?: string;
	onSuggestionSelect?: (suggestion: string, type: SuggestionType) => void;
}

function HighlightedTextarea({
	className,
	value = "",
	onChange,
	placeholder,
	disabled,
	suggestions = [],
	guildId,
	onSuggestionSelect,
	...props
}: HighlightedTextareaProps) {
	const divRef = useRef<HTMLDivElement>(null);
	const [cursorPosition, setCursorPosition] = useState<number | null>(null);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [currentTrigger, setCurrentTrigger] = useState<string>("");
	const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>(
		[],
	);
	const [guildData, setGuildData] = useState<GuildData | null>(null);
	const [allSuggestions, setAllSuggestions] =
		useState<Suggestion[]>(suggestions);

	// Pobieranie dodatkowych danych (np. role, kanały) dla sugestii
	useEffect(() => {
		if (!guildId) return;

		const guild = getCachedData<GuildData>(`guild-${guildId}`);
		setGuildData(guild?.data || null);

		if (guild?.data) {
			const roleSuggestions: Suggestion[] = (guild.data.roles || []).map(
				(role) => ({
					name: role.name,
					id: role.id,
					type: "role",
					color: role.color,
				}),
			);

			const channelSuggestions: Suggestion[] = (guild.data.channels || [])
				.filter((channel) => channel.type === 0)
				.map((channel) => ({
					name: channel.name,
					id: channel.id,
					type: "channel",
				}));

			setAllSuggestions([
				...suggestions,
				...roleSuggestions,
				...channelSuggestions,
			]);
		}
	}, [guildId, suggestions]);

	// Ustalanie triggerów dla sugestii
	const triggers = {
		"{": "placeholder",
		"@": "role",
		"#": "channel",
	} as const;

	// Renderowanie zawartości z podświetleniem składników (np. tekst w nawiasach, role, kanały)
	const renderContent = () => {
		const text = value || placeholder || "";
		let result = "";
		let buffer = "";
		let inPlaceholder = false;
		let inMention = false;

		const chars = text.split("");
		for (let i = 0; i < chars.length; i++) {
			const char = chars[i];

			// Start of placeholder or mention
			if (char === "{" || ((char === "@" || char === "#") && !inPlaceholder)) {
				// Flush buffer if exists
				if (buffer) {
					result += buffer;
					buffer = "";
				}

				if (char === "{") {
					inPlaceholder = true;
					buffer = char;
				} else {
					inMention = true;
					buffer = char;
				}
				continue;
			}

			// End of placeholder
			if (char === "}" && inPlaceholder) {
				buffer += char;
				result += `<span class="bg-foreground text-background">${buffer}</span>`;
				buffer = "";
				inPlaceholder = false;
				continue;
			}

			// End of mention (space or special char)
			if (
				inMention &&
				(char === " " || char === "{" || char === "@" || char === "#")
			) {
				if (buffer.length > 1) {
					result += `<span class="text-blue-500">${buffer}</span>`;
				} else {
					result += buffer;
				}
				result += char;
				buffer = "";
				inMention = false;
				continue;
			}

			// Add to buffer
			if (inPlaceholder || inMention) {
				buffer += char;
			} else {
				result += char;
			}
		}

		// Flush remaining buffer
		if (buffer) {
			if (inMention && buffer.length > 1) {
				result += `<span class="text-blue-500">${buffer}</span>`;
			} else {
				result += buffer;
			}
		}

		return result;
	};

	// Handler input – zapisuje pozycję kursora i aktualizuje wartość
	const handleInput = useCallback(
		(e: React.FormEvent<HTMLDivElement>) => {
			const target = e.currentTarget;
			const newContent = target.textContent || "";

			if (newContent !== value) {
				const selection = window.getSelection();
				if (selection && selection.rangeCount > 0) {
					const range = selection.getRangeAt(0);
					let position = 0;
					const walk = document.createTreeWalker(
						target,
						NodeFilter.SHOW_TEXT,
						null,
					);
					let node = walk.nextNode();

					while (node && node !== range.startContainer) {
						position += (node as Text).length;
						node = walk.nextNode();
					}

					position += range.startOffset;
					setCursorPosition(position);
				}

				onChange?.(newContent);
			}
		},
		[onChange, value],
	);

	// Przywracanie pozycji kursora po renderowaniu
	useLayoutEffect(() => {
		if (cursorPosition === null) return;

		requestAnimationFrame(() => {
			const div = divRef.current;
			if (!div) return;

			const selection = window.getSelection();
			if (!selection) return;

			let currentPos = 0;
			let targetNode: Node | null = null;
			let targetOffset = 0;

			const walk = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);

			let node = walk.nextNode();
			while (node) {
				const nodeLength = (node as Text).length;
				if (currentPos + nodeLength >= cursorPosition) {
					targetNode = node;
					targetOffset = cursorPosition - currentPos;
					break;
				}
				currentPos += nodeLength;
				node = walk.nextNode();
			}

			if (!targetNode) {
				// Jeśli nie znaleziono odpowiedniego węzła, użyj ostatniego
				const lastNode = div.lastChild;
				if (lastNode) {
					targetNode = lastNode;
					targetOffset = lastNode.textContent?.length || 0;
				}
			}

			if (targetNode) {
				const range = document.createRange();
				range.setStart(targetNode, targetOffset);
				range.collapse(true);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		});
	}, [cursorPosition]);

	// Handler klawiatury – obsługa triggerów oraz natywne undo/redo
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			// Pozwól na undo/redo (ctrl/⌘+Z lub ctrl/⌘+Y)
			if ((e.metaKey || e.ctrlKey) && (e.key === "z" || e.key === "y")) {
				return;
			}
			const trigger = e.key;
			if (trigger in triggers) {
				e.preventDefault();
				const selection = window.getSelection();
				if (selection) {
					const pos = selection.anchorOffset;
					const currentText = String(value);
					const newValue =
						currentText.slice(0, pos) + trigger + currentText.slice(pos);

					setCurrentTrigger(trigger);
					setFilteredSuggestions(
						allSuggestions.filter(
							(s) => s.type === triggers[trigger as keyof typeof triggers],
						),
					);
					onChange?.(newValue);
					setShowSuggestions(true);
				}
			}
		},
		[value, onChange, allSuggestions, triggers],
	);

	const handleSuggestionSelect = useCallback(
		(suggestion: string) => {
			const currentText = String(value);
			let newValue = currentText;

			if (currentTrigger === "{") {
				newValue = currentText.replace(/\{$/, `{${suggestion}}`);
			} else if (currentTrigger === "@" || currentTrigger === "#") {
				newValue = currentText.replace(
					new RegExp(`\\${currentTrigger}$`),
					`${currentTrigger}${suggestion}`,
				);
			}

			onChange?.(newValue);
			onSuggestionSelect?.(
				suggestion,
				triggers[currentTrigger as keyof typeof triggers],
			);
			setShowSuggestions(false);
			setCurrentTrigger("");
		},
		[value, onChange, currentTrigger, onSuggestionSelect, triggers],
	);

	return (
		<div className="relative">
			<div
				ref={divRef}
				contentEditable={!disabled}
				role="textbox"
				aria-multiline="true"
				data-slot="textarea"
				suppressContentEditableWarning
				onInput={handleInput}
				onKeyDown={handleKeyDown}
				className={cn(
					"border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50",
					"min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none",
					"focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
					"whitespace-pre-wrap absolute inset-0 text-transparent caret-foreground",
					className,
				)}
			>
				{value || placeholder || ""}
			</div>
			<div
				aria-hidden="true"
				className={cn(
					"border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50",
					"min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none",
					"focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
					"whitespace-pre-wrap pointer-events-none",
					className,
				)}
				// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
				dangerouslySetInnerHTML={{ __html: renderContent() }}
			/>
			{showSuggestions && filteredSuggestions.length > 0 && (
				<Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
					<PopoverTrigger asChild>
						<div className="absolute" />
					</PopoverTrigger>
					<PopoverContent className="w-80 p-0" align="start" sideOffset={5}>
						<Command>
							<CommandList>
								<CommandEmpty>No suggestions found.</CommandEmpty>
								<CommandGroup>
									{filteredSuggestions.map((suggestion) => (
										<CommandItem
											key={suggestion.name}
											onSelect={() => handleSuggestionSelect(suggestion.name)}
										>
											{suggestion.type === "placeholder" ? (
												<div className="flex flex-col">
													<div className="font-medium">
														{`{${suggestion.name}}`}
													</div>
													<div className="text-sm text-muted-foreground">
														{suggestion.description}
														{suggestion.example &&
															` (e.g., ${suggestion.example})`}
													</div>
												</div>
											) : suggestion.type === "role" ? (
												<div className="flex items-center">
													<div
														className="mr-2 h-3 w-3 rounded-full"
														style={{
															backgroundColor: `#${suggestion.color
																?.toString(16)
																.padStart(6, "0")}`,
														}}
													/>
													{suggestion.name}
												</div>
											) : (
												<div># {suggestion.name}</div>
											)}
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
}

export { Textarea, HighlightedTextarea };
