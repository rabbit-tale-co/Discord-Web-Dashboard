import type React from "react";
import {
	useRef,
	useState,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
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
import type { Suggestion } from "@/components/ui/custom-textarea";
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
	onSuggestionSelect?: (suggestion: string) => void;
}

interface SuggestionState {
	isOpen: boolean;
	position: { top: number; left: number } | null;
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
	const [guildData, setGuildData] = useState<GuildData | null>(null);

	// Separate states for each trigger type
	const [variableSuggestion, setVariableSuggestion] = useState<SuggestionState>(
		{
			isOpen: false,
			position: null,
		},
	);
	const [roleSuggestion, setRoleSuggestion] = useState<SuggestionState>({
		isOpen: false,
		position: null,
	});
	const [channelSuggestion, setChannelSuggestion] = useState<SuggestionState>({
		isOpen: false,
		position: null,
	});

	// Pobieranie danych o serwerze
	useEffect(() => {
		if (!guildId) return;

		const guild = getCachedData<GuildData>(`guild-${guildId}`);
		setGuildData(guild?.data || null);
	}, [guildId]);

	// Filtrowanie ról i kanałów
	const filteredRoles = useMemo(() => {
		if (!guildData) return [];
		return guildData.roles || [];
	}, [guildData]);

	const filteredChannels = useMemo(() => {
		if (!guildData) return [];
		return (guildData.channels || []).filter((channel) => channel.type === 0);
	}, [guildData]);

	// Handler klawiatury – obsługa triggerów
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			if ((e.metaKey || e.ctrlKey) && (e.key === "z" || e.key === "y")) {
				return;
			}

			const selection = window.getSelection();
			if (!selection || !selection.rangeCount) return;

			const range = selection.getRangeAt(0);
			const rect = range.getBoundingClientRect();
			const divRect = divRef.current?.getBoundingClientRect();
			if (!divRect) return;

			const position = {
				top: rect.bottom - divRect.top,
				left: rect.left - divRect.left,
			};

			switch (e.key) {
				case "{":
				case "@":
				case "#": {
					e.preventDefault();

					// Insert a temporary marker at cursor position
					const marker = document.createTextNode("\u200B"); // Zero-width space
					range.insertNode(marker);
					range.setStartAfter(marker);
					range.collapse(true);
					selection.removeAllRanges();
					selection.addRange(range);

					if (e.key === "{") {
						setVariableSuggestion({ isOpen: true, position });
						setRoleSuggestion({ isOpen: false, position: null });
						setChannelSuggestion({ isOpen: false, position: null });
					} else if (e.key === "@") {
						setRoleSuggestion({ isOpen: true, position });
						setVariableSuggestion({ isOpen: false, position: null });
						setChannelSuggestion({ isOpen: false, position: null });
					} else {
						setChannelSuggestion({ isOpen: true, position });
						setVariableSuggestion({ isOpen: false, position: null });
						setRoleSuggestion({ isOpen: false, position: null });
					}
					break;
				}
			}
		},
		[],
	);

	const handleSuggestionSelect = useCallback(
		(type: "variable" | "role" | "channel", name: string, id: string) => {
			const selection = window.getSelection();
			if (!selection || !selection.rangeCount) return;

			const range = selection.getRangeAt(0);
			let insertText = "";

			switch (type) {
				case "variable":
					insertText = `{${name}}`;
					setVariableSuggestion({ isOpen: false, position: null });
					break;
				case "role":
					insertText = `<@&${id}>`;
					setRoleSuggestion({ isOpen: false, position: null });
					break;
				case "channel":
					insertText = `<#${id}>`;
					setChannelSuggestion({ isOpen: false, position: null });
					break;
			}

			// Find and remove the marker
			const div = divRef.current;
			if (div) {
				const walker = document.createTreeWalker(
					div,
					NodeFilter.SHOW_TEXT,
					null,
				);
				let node = walker.nextNode();
				while (node) {
					if (node.textContent === "\u200B") {
						const textNode = document.createTextNode(insertText);
						node.parentNode?.replaceChild(textNode, node);
						range.setStartAfter(textNode);
						range.collapse(true);
						selection.removeAllRanges();
						selection.addRange(range);
						break;
					}
					node = walker.nextNode();
				}
			}

			const event = new Event("input", { bubbles: true });
			divRef.current?.dispatchEvent(event);
		},
		[],
	);

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

	// Renderowanie zawartości z podświetleniem zmiennych
	const renderContent = useCallback(() => {
		const text = value || placeholder || "";
		let result = "";
		let lastIndex = 0;

		// Znajdujemy wszystkie zmienne w tekście
		const regex = /\{([^}]+)\}/g;
		let match: RegExpExecArray | null = regex.exec(text);

		while (match !== null) {
			// Dodaj tekst przed zmienną
			result += text.slice(lastIndex, match.index);
			// Dodaj zmienną w mark
			result += `<mark class="bg-foreground/10 text-foreground px-1 rounded">${match[0]}</mark>`;
			lastIndex = match.index + match[0].length;
			match = regex.exec(text);
		}

		// Dodaj pozostały tekst
		result += text.slice(lastIndex);

		return result;
	}, [value, placeholder]);

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
					"whitespace-pre-wrap [&_mark]:bg-foreground/10 [&_mark]:text-foreground [&_mark]:px-1 [&_mark]:rounded",
					className,
				)}
			>
				{value || placeholder || ""}
			</div>

			{/* Variables Popover */}
			{variableSuggestion.isOpen && variableSuggestion.position && (
				<Popover
					key="variable-popover"
					open={variableSuggestion.isOpen}
					onOpenChange={(open) =>
						setVariableSuggestion({ ...variableSuggestion, isOpen: open })
					}
					modal={true}
				>
					<PopoverTrigger asChild>
						<div
							className="absolute w-0 h-0"
							style={{
								top: `${variableSuggestion.position.top}px`,
								left: `${variableSuggestion.position.left}px`,
							}}
						/>
					</PopoverTrigger>
					<PopoverContent
						align="start"
						className="w-[200px] p-0"
						onOpenAutoFocus={(e) => e.preventDefault()}
					>
						<Command>
							<CommandList>
								<CommandEmpty>No placeholders found.</CommandEmpty>
								<CommandGroup>
									{suggestions.map((item) => (
										<CommandItem
											key={item.id}
											onSelect={() =>
												handleSuggestionSelect("variable", item.name, item.id)
											}
											className="flex items-center gap-2"
										>
											<div className="flex flex-col">
												<div className="font-medium">{item.name}</div>
												{item.description && (
													<div className="text-sm text-muted-foreground">
														{item.description}
														{item.example && ` (e.g., ${item.example})`}
													</div>
												)}
											</div>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			)}

			{/* Roles Popover */}
			{roleSuggestion.isOpen && roleSuggestion.position && (
				<Popover
					key="role-popover"
					open={roleSuggestion.isOpen}
					onOpenChange={(open) =>
						setRoleSuggestion({ ...roleSuggestion, isOpen: open })
					}
					modal={true}
				>
					<PopoverTrigger asChild>
						<div
							className="absolute w-0 h-0"
							style={{
								top: `${roleSuggestion.position.top}px`,
								left: `${roleSuggestion.position.left}px`,
							}}
						/>
					</PopoverTrigger>
					<PopoverContent
						align="start"
						className="w-[200px] p-0"
						onOpenAutoFocus={(e) => e.preventDefault()}
					>
						<Command>
							<CommandList>
								<CommandEmpty>No roles found.</CommandEmpty>
								<CommandGroup>
									{filteredRoles.map((role) => (
										<CommandItem
											key={role.id}
											onSelect={() =>
												handleSuggestionSelect("role", role.name, role.id)
											}
											className="flex items-center gap-2"
										>
											<div className="flex items-center gap-2">
												<div
													className="h-3 w-3 rounded-full flex-shrink-0"
													style={{
														backgroundColor: `#${role.color?.toString(16).padStart(6, "0")}`,
													}}
												/>
												<span>{role.name}</span>
											</div>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			)}

			{/* Channels Popover */}
			{channelSuggestion.isOpen && channelSuggestion.position && (
				<Popover
					key="channel-popover"
					open={channelSuggestion.isOpen}
					onOpenChange={(open) =>
						setChannelSuggestion({ ...channelSuggestion, isOpen: open })
					}
					modal={true}
				>
					<PopoverTrigger asChild>
						<div
							className="absolute w-0 h-0"
							style={{
								top: `${channelSuggestion.position.top}px`,
								left: `${channelSuggestion.position.left}px`,
							}}
						/>
					</PopoverTrigger>
					<PopoverContent
						align="start"
						className="w-[200px] p-0"
						onOpenAutoFocus={(e) => e.preventDefault()}
					>
						<Command>
							<CommandList>
								<CommandEmpty>No channels found.</CommandEmpty>
								<CommandGroup>
									{filteredChannels.map((channel) => (
										<CommandItem
											key={channel.id}
											onSelect={() =>
												handleSuggestionSelect(
													"channel",
													channel.name,
													channel.id,
												)
											}
											className="flex items-center gap-2"
										>
											<div className="flex items-center gap-2">
												<span className="flex-shrink-0">#</span>
												<span>{channel.name}</span>
											</div>
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
