"use client";

/**
 * PlateEditor - Komponent edytora tekstu oparty na Plate.js
 *
 * Obsługa różnych formatów wejściowych:
 * 1. HTML - Konwersja HTML na format Plate Value
 *    - Wykorzystuje wbudowane API edytora, jeśli jest dostępne
 *    - Fallback do ekstrakcji tekstu i przetwarzania jako markdown lub plain text
 *
 * 2. Markdown - Konwersja markdown na format Plate Value
 *    - Obsługa podstawowych formatowań: nagłówki, pogrubienie, kursywa, kod, listy
 *
 * 3. Plain Text - Konwersja zwykłego tekstu na format Plate Value
 *
 * Możliwości rozwoju:
 * - Dodanie wtyczki @udecode/plate-html dla pełnej obsługi deserializacji HTML
 * - Rozbudowanie obsługi Markdown o tabele, linki, etc.
 * - Dodanie eksportu zawartości do HTML/Markdown
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { UseFormReturn, FieldValues } from "react-hook-form";
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
} from "@/components/ui/form";
import { Plate, PlateContent, useEditorState } from "@udecode/plate/react";
import { useCreateEditor } from "@/components/editor/use-create-editor";
import type { Value, Node as PlateNode } from "@udecode/plate";
import { Editor } from "@/components/plate-ui/editor";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { getCachedData } from "@/lib/cache";
import type { FormFieldProps } from "@/lib/types";
import type { Variable, Category } from "@/lib/types/discord";
import { useMounted } from "@/hooks/use-mounted";
import { usePlateContentLength } from "./use-plate-content-length";
import { PlateContentLength } from "./plate-content-length";

// Default variables and categories
const defaultVariables: Variable[] = [
	{ id: "user", name: "user", category: "variable" },
	{ id: "server", name: "server", category: "variable" },
	{ id: "server_name", name: "server_name", category: "variable" },
	{ id: "username", name: "username", category: "variable" },
	{ id: "server_image", name: "server_image", category: "variable" },
	{ id: "avatar", name: "avatar", category: "variable" },
];

// Fallback roles and channels
const fallbackRoles: Variable[] = [
	{ id: "admin", name: "admin", category: "role" },
	{ id: "moderator", name: "moderator", category: "role" },
	{ id: "member", name: "member", category: "role" },
];

const fallbackChannels: Variable[] = [
	{ id: "general", name: "general", category: "channel" },
	{ id: "welcome", name: "welcome", category: "channel" },
	{ id: "announcements", name: "announcements", category: "channel" },
];

const defaultCategories: Category[] = [
	{ id: "variable", name: "Variables", icon: "🔄" },
	{ id: "role", name: "Roles", icon: "👥" },
	{ id: "channel", name: "Channels", icon: "📢" },
	{ id: "customId", name: "Custom IDs", icon: "🔖" },
];

// Helper function to get roles from cache
function getRolesFromCache(guildId: string): Variable[] {
	const cacheKey = `guild-${guildId}`;
	const cachedGuildData = getCachedData<{
		roles?: Array<{ id: string; name: string }>;
	}>(cacheKey);

	if (cachedGuildData?.data?.roles && cachedGuildData.data.roles.length > 0) {
		return cachedGuildData.data.roles.map((role) => ({
			id: role.id,
			name: role.name,
			category: "role",
		}));
	}

	return fallbackRoles;
}

// Helper function to get channels from cache
function getChannelsFromCache(guildId: string): Variable[] {
	const cacheKey = `guild-${guildId}`;
	const cachedGuildData = getCachedData<{
		channels?: Array<{ id: string; name: string; type?: number }>;
	}>(cacheKey);

	if (
		cachedGuildData?.data?.channels &&
		cachedGuildData.data.channels.length > 0
	) {
		// Filter out category channels (type 4 is GUILD_CATEGORY) and ensure type is defined
		const nonCategoryChannels = cachedGuildData.data.channels.filter(
			(channel) => {
				return typeof channel.type === "number" && channel.type !== 4;
			},
		);

		return nonCategoryChannels.map((channel) => ({
			id: channel.id,
			name: channel.name,
			category: "channel",
		}));
	}

	return fallbackChannels;
}

// Interface for PlateEditor props
interface PlateEditorFieldProps extends FormFieldProps {
	id?: string;
	initialValue?: Value;
	rows?: number;
	showEmojiPicker?: boolean;
	singleLine?: boolean;
	form?: UseFormReturn<FieldValues>;
}

/**
 * Konwertuje zwykły tekst na format Value dla edytora Plate
 * @param text Tekst do konwersji
 * @returns Value dla edytora Plate
 */
export function textToPlateValue(text: string): Value {
	if (!text) return [{ type: "p", children: [{ text: "" }] }];

	// Najprostszy przypadek - jeden paragraf
	return [
		{
			type: "p",
			children: [{ text }],
		},
	];
}

/**
 * Konwertuje prosty tekst markdown na format Value dla edytora Plate
 * Obsługuje podstawowe formatowanie: **bold**, *italic*, `code`, oraz podstawowe nagłówki # i ##
 * @param markdownText Tekst markdown do konwersji
 * @returns Value dla edytora Plate
 */
export function markdownToPlateValue(markdownText: string): Value {
	const lines = markdownText.split("\n");
	const value: Value = [];

	let currentListItems: {
		text: string;
		type?: string;
		children?: {
			text: string;
			bold?: boolean;
			italic?: boolean;
			code?: boolean;
		}[];
	}[] = [];
	let listType: "ul" | "ol" | null = null;

	// Przetwarzaj linię po linii
	for (const line of lines) {
		// Pomiń puste linie
		if (!line) {
			// Jeśli mamy otwarty element listy, dodaj go do value
			if (currentListItems.length > 0 && listType) {
				value.push({
					type: listType as string, // Type assertion to tell TypeScript this is a string
					children: [...currentListItems],
				});
				currentListItems = [];
				listType = null;
			}
			continue;
		}

		// Nagłówek H1
		if (line.startsWith("# ")) {
			// Zamknij otwartą listę
			if (currentListItems.length > 0 && listType) {
				value.push({
					type: listType as string,
					children: [...currentListItems],
				});
				currentListItems = [];
				listType = null;
			}

			value.push({
				type: "h1",
				children: [{ text: line.substring(2) }],
			});
			continue;
		}

		// Nagłówek H2
		if (line.startsWith("## ")) {
			// Zamknij otwartą listę
			if (currentListItems.length > 0 && listType) {
				value.push({
					type: listType as string,
					children: [...currentListItems],
				});
				currentListItems = [];
				listType = null;
			}

			value.push({
				type: "h2",
				children: [{ text: line.substring(3) }],
			});
			continue;
		}

		// Nagłówek H3
		if (line.startsWith("### ")) {
			// Zamknij otwartą listę
			if (currentListItems.length > 0 && listType) {
				value.push({
					type: listType as string,
					children: [...currentListItems],
				});
				currentListItems = [];
				listType = null;
			}

			value.push({
				type: "h3",
				children: [{ text: line.substring(4) }],
			});
			continue;
		}

		// Lista numerowana
		if (line.match(/^\d+\.\s/)) {
			const text = line.replace(/^\d+\.\s/, "");
			const formattedSegments = parseInlineFormatting(text);

			// Jeśli wcześniejsza lista była inna niż numerowana, zamknij ją
			if (listType !== "ol" && currentListItems.length > 0 && listType) {
				value.push({
					type: listType as string,
					children: [...currentListItems],
				});
				currentListItems = [];
			}

			listType = "ol";
			currentListItems.push({
				type: "li",
				children: [{ text: text }],
			});
			continue;
		}

		// Lista nienumerowana
		if (line.startsWith("- ")) {
			const text = line.substring(2);
			const formattedSegments = parseInlineFormatting(text);

			// Jeśli wcześniejsza lista była inna niż nienumerowana, zamknij ją
			if (listType !== "ul" && currentListItems.length > 0 && listType) {
				value.push({
					type: listType as string,
					children: [...currentListItems],
				});
				currentListItems = [];
			}

			listType = "ul";
			currentListItems.push({
				type: "li",
				children: [{ text: text }],
			});
			continue;
		}

		// Kod w bloku (zakładamy, że pojedyncza linia kodu jest otoczona ``)
		if (line.startsWith("```") && line.endsWith("```") && line.length > 6) {
			// Zamknij otwartą listę
			if (currentListItems.length > 0 && listType) {
				value.push({
					type: listType as string,
					children: [...currentListItems],
				});
				currentListItems = [];
				listType = null;
			}

			value.push({
				type: "code_block",
				children: [{ text: line.substring(3, line.length - 3) }],
			});
			continue;
		}

		// Normalny tekst z formatowaniem
		const formattedSegments = parseInlineFormatting(line);

		// Tutaj obsługujemy zwykły tekst, który nie jest częścią listy
		if (currentListItems.length > 0 && listType) {
			value.push({
				type: listType as string,
				children: [...currentListItems],
			});
			currentListItems = [];
			listType = null;
		}

		value.push({
			type: "p",
			children: formattedSegments.map((segment) => ({
				text: segment.text,
				...(segment.bold && { bold: true }),
				...(segment.italic && { italic: true }),
				...(segment.code && { code: true }),
			})),
		});
	}

	// Dodaj ostatnią listę, jeśli istnieje
	if (currentListItems.length > 0 && listType) {
		value.push({
			type: listType as string,
			children: [...currentListItems],
		});
	}

	return value;
}

/**
 * Parsuje wewnętrzne formatowanie tekstu markdown
 * @param text Tekst do przetworzenia
 * @returns Tablica dzieci dla węzła Plate z odpowiednim formatowaniem
 */
function parseInlineFormatting(
	text: string,
): { text: string; bold?: boolean; italic?: boolean; code?: boolean }[] {
	const result: {
		text: string;
		bold?: boolean;
		italic?: boolean;
		code?: boolean;
	}[] = [];

	// Funkcja pomocnicza do wyodrębniania tekstu między znacznikami
	function extractFormatting(
		fullText: string,
		startDelimiter: string,
		endDelimiter: string,
		format: "bold" | "italic" | "code",
	) {
		let remainingText = fullText;
		const segments: {
			text: string;
			bold?: boolean;
			italic?: boolean;
			code?: boolean;
		}[] = [];

		while (remainingText.length > 0) {
			const startIndex = remainingText.indexOf(startDelimiter);
			if (startIndex === -1) {
				// Nie znaleziono więcej znaczników początkowych
				if (segments.length === 0) {
					// Żadne formatowanie nie zostało znalezione, zwróć oryginalny tekst
					return [{ text: fullText }];
				}
				// Dodaj pozostały tekst bez formatowania
				if (remainingText.length > 0) {
					segments.push({ text: remainingText });
				}
				break;
			}

			// Dodaj tekst przed znacznikiem
			if (startIndex > 0) {
				segments.push({ text: remainingText.substring(0, startIndex) });
			}

			// Znajdź końcowy znacznik
			const afterStart = remainingText.substring(
				startIndex + startDelimiter.length,
			);
			const endIndex = afterStart.indexOf(endDelimiter);

			if (endIndex === -1) {
				// Nie znaleziono znacznika końcowego, traktuj znacznik początkowy jako zwykły tekst
				segments.push({ text: startDelimiter });
				remainingText = afterStart;
				continue;
			}

			// Wyodrębnij sformatowany tekst
			const formattedText = afterStart.substring(0, endIndex);

			// Dodaj sformatowany segment
			const formattingProps: {
				bold?: boolean;
				italic?: boolean;
				code?: boolean;
			} = {};
			formattingProps[format] = true;
			segments.push({ text: formattedText, ...formattingProps });

			// Aktualizuj pozostały tekst
			remainingText = afterStart.substring(endIndex + endDelimiter.length);
		}

		return segments.length > 0 ? segments : [{ text: fullText }];
	}

	// Sprawdź najpierw code, potem bold, potem italic (kolejność ważna)
	// Ta implementacja jest uproszczona i nie obsługuje zagnieżdżonego formatowania

	// Code
	const codeSegments = extractFormatting(text, "`", "`", "code");
	if (codeSegments.length > 1 || codeSegments[0].code) {
		return codeSegments;
	}

	// Bold
	const boldSegments = extractFormatting(text, "**", "**", "bold");
	if (boldSegments.length > 1 || boldSegments[0].bold) {
		return boldSegments;
	}

	// Italic
	const italicSegments = extractFormatting(text, "*", "*", "italic");
	if (italicSegments.length > 1 || italicSegments[0].italic) {
		return italicSegments;
	}

	// Nie znaleziono formatowania, zwróć oryginalny tekst
	return [{ text }];
}

/**
 * Konwertuje HTML na format Value dla edytora Plate
 * Funkcja tworzy tymczasowy edytor i wykorzystuje jego API do deserializacji
 * @param html Tekst HTML do konwersji
 * @returns Value dla edytora Plate
 */
export function htmlToPlateValue(html: string): Value {
	if (!html) return [{ type: "p", children: [{ text: "" }] }];

	// Wykorzystujemy tymczasowy edytor, który będzie miał dostęp do API deserializacji HTML
	// W implementacji klienta będziemy używać bezpośrednio istniejącej instancji edytora
	try {
		// Najpierw sprawdzamy, czy to faktycznie HTML
		if (html.includes("<") && html.includes(">")) {
			// W rzeczywistości będziemy używać edytora dostępnego w komponencie
			// Teraz przygotujmy fallback na tekst
			const tempDiv = document.createElement("div");
			tempDiv.innerHTML = html;
			const plainText = tempDiv.textContent || tempDiv.innerText || html;

			// Sprawdźmy, czy tekst zawiera markdown
			if (
				plainText.includes("#") ||
				plainText.includes("*") ||
				plainText.includes("`") ||
				plainText.includes("- ") ||
				plainText.includes("1. ")
			) {
				return markdownToPlateValue(plainText);
			}
			return textToPlateValue(plainText);
		}

		// Jeśli to nie HTML, możemy próbować traktować jako markdown lub zwykły tekst
		return textToPlateValue(html);
	} catch (error) {
		console.error("Error converting HTML to Plate value:", error);
		// Fallback do zwykłego tekstu w przypadku błędu
		return [{ type: "p", children: [{ text: html }] }];
	}
}

export function PlateEditor({
	name,
	label,
	description,
	placeholder = "Type...",
	maxLength,
	initialValue,
	rows = 3, // Domyślna wartość 3 wiersze
	showEmojiPicker = true, // Domyślnie pokazujemy picker emoji
	singleLine = false, // Domyślnie wieloliniowy edytor
	id = `editor-${name}`,
	form: explicitForm, // Get the explicitly passed form if any
}: PlateEditorFieldProps) {
	const params = useParams();
	const guildId = params.id as string;
	const formContext = useFormContext(); // Get form from context
	const form = explicitForm || formContext; // Use explicit form if provided, otherwise use context

	// Pobieranie wartości z formularza
	const fieldValue = form.watch(name);
	const [editorInitialValue, setEditorInitialValue] = useState<
		Value | undefined
	>(initialValue);

	// Create the editor early so we can use its API
	const editor = useCreateEditor({
		id,
		value: editorInitialValue,
		maxLength,
		placeholder,
	});

	// Helper function to deserialize HTML using the editor's API
	const deserializeFromHtml = useCallback(
		(html: string): Value => {
			if (!html || !editor) return [{ type: "p", children: [{ text: "" }] }];

			try {
				// Check if it has HTML tags
				if (html.includes("<") && html.includes(">")) {
					// Use the editor's HTML deserialization API if available
					if (
						editor.api?.html?.deserialize &&
						typeof editor.api.html.deserialize === "function"
					) {
						try {
							// Deserialize HTML with proper parameters
							const element = document.createElement("div");
							element.innerHTML = html;

							const deserializedValue = editor.api.html.deserialize({
								element,
								collapseWhiteSpace: true,
							});

							// Sprawdź czy otrzymany wynik ma poprawny format
							if (
								Array.isArray(deserializedValue) &&
								deserializedValue.length > 0
							) {
								return deserializedValue as Value;
							}
						} catch (deserializeError) {
							console.error(
								"Error using editor's HTML deserializer:",
								deserializeError,
							);
							// Continue to fallback
						}
					}

					// Fallback to text extraction if API not available or failed
					const tempDiv = document.createElement("div");
					tempDiv.innerHTML = html;
					const plainText = tempDiv.textContent || tempDiv.innerText || html;

					// Check if it contains markdown formatting
					if (
						plainText.includes("#") ||
						plainText.includes("*") ||
						plainText.includes("`") ||
						plainText.includes("- ") ||
						plainText.includes("1. ")
					) {
						return markdownToPlateValue(plainText);
					}

					return textToPlateValue(plainText);
				}

				// Check if it contains markdown
				if (
					html.includes("#") ||
					html.includes("*") ||
					html.includes("`") ||
					html.includes("- ") ||
					html.includes("1. ")
				) {
					return markdownToPlateValue(html);
				}

				// Default to plain text
				return textToPlateValue(html);
			} catch (error) {
				console.error("Error converting HTML to Plate value:", error);
				return [{ type: "p", children: [{ text: html }] }];
			}
		},
		[editor],
	);

	// Konwersja wartości formularza na wartość dla edytora, jeśli nie ma initialValue
	useEffect(() => {
		if (!initialValue && fieldValue && typeof fieldValue === "string") {
			// Try to deserialize HTML, otherwise fall back to plain text
			try {
				const deserializedValue = deserializeFromHtml(fieldValue);
				setEditorInitialValue(deserializedValue);
			} catch (error) {
				console.error("Error deserializing field value:", error);
				setEditorInitialValue(textToPlateValue(fieldValue));
			}
		}
	}, [initialValue, fieldValue, deserializeFromHtml]);

	// References and state
	const [roles, setRoles] = useState<Variable[]>([]);
	const [channels, setChannels] = useState<Variable[]>([]);
	const mountRef = useRef(true);
	const editorKey = useRef(`${id}-${Date.now()}`).current;
	const [contentHeight, setContentHeight] = useState(0);

	// Stała wysokość pojedynczego wiersza w pikselach
	const rowHeight = 48; // Stała wysokość wiersza w pikselach

	// Obliczanie wysokości na podstawie parametru rows i singleLine
	const minRows = singleLine ? 1 : rows || 3; // Jeśli singleLine, to zawsze 1 wiersz
	const maxRows = singleLine ? 1 : rows * 2 < 20 ? rows * 2 : 20; // W trybie singleLine, zawsze 1 wiersz
	const minHeight = minRows * rowHeight;
	const maxHeight = maxRows * rowHeight;

	// Base editor styles
	const EditorStyle = cn(
		"border-input placeholder:text-muted-foreground focus-visible:border-ring aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex flex-col field-sizing-content w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm whitespace-pre-wrap break-words",
		// Added additional styles for better text wrapping and overflow handling
		"overflow-x-hidden overflow-wrap-anywhere hyphens-auto word-break-break-word max-w-full",
		singleLine ? "single-line-editor" : "editor-auto-resize", // Różne klasy dla trybu jednoliniowego i wieloliniowego
		maxLength && "pb-6",
	);

	// Bardziej dynamiczne style dla edytora wykorzystujące rows i singleLine
	const editorDynamicStyle = {
		minHeight: `${minHeight}px`,
		// W trybie singleLine zawsze używamy minHeight
		height: singleLine
			? `${minHeight}px`
			: contentHeight > minHeight
				? `${contentHeight}px`
				: `${minHeight}px`,
		maxHeight: singleLine
			? `${minHeight}px`
			: maxHeight
				? `${maxHeight}px`
				: "none",
		overflow: singleLine
			? "hidden"
			: maxHeight && contentHeight > maxHeight
				? "auto"
				: "visible",
		transition: "height 0.1s ease", // Płynne przejście podczas zmiany wysokości
	};

	// Callback do aktualizacji wysokości na podstawie zawartości
	const handleContentChange = useCallback(
		({ value }: { value: Value }) => {
			// Tutaj możesz dodać logikę oszacowania wysokości na podstawie zawartości
			// Dla uproszczenia, załóżmy że każdy paragraf ma wysokość rowHeight
			const lines = value.reduce((total, node) => {
				// Określamy typ węzła z definicji Plate
				const plateNode = node as PlateNode & { text?: string };

				// Liczba linii tekstu w paragrafie (przybliżenie)
				if (typeof plateNode.text === "string") {
					// Przybliżenie: 80 znaków na linię
					return total + Math.max(1, Math.ceil(plateNode.text.length / 80));
				}

				// Każdy blok ma co najmniej jedną linię
				return total + 1;
			}, 0);

			// Dodajemy trochę marginesu - używamy stałej rowHeight bez dodawania jej jako zależności
			const estimatedHeight = Math.max(minHeight, lines * rowHeight);
			setContentHeight(estimatedHeight);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[minHeight], // rowHeight jest stałą i nie powinna być zależnością
	);

	// Effect to load roles and channels from cache
	useEffect(() => {
		try {
			if (!guildId) {
				setRoles(fallbackRoles);
				setChannels(fallbackChannels);
				return;
			}

			const rolesFromCache = getRolesFromCache(guildId);
			const channelsFromCache = getChannelsFromCache(guildId);

			if (mountRef.current) {
				setRoles(rolesFromCache);
				setChannels(channelsFromCache);
			}
		} catch (err) {
			console.error("Failed to load guild data from cache:", err);
			// Use fallbacks on error
			if (mountRef.current) {
				setRoles(fallbackRoles);
				setChannels(fallbackChannels);
			}
		}
	}, [guildId]);

	// Synchronize editor value with form when editor is initialized or value changes
	useEffect(() => {
		if (editor && editorInitialValue) {
			// This should affect the editor without updating the form
			editor.children = editorInitialValue;
		}
	}, [editor, editorInitialValue]);

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => {
				return (
					<FormItem>
						{label && <FormLabel>{label}</FormLabel>}
						<FormControl>
							<Plate
								key={editorKey}
								editor={editor}
								onChange={handleContentChange}
							>
								<div className="relative">
									<PlateContent
										className={EditorStyle}
										// Use inline style for dynamic height instead
										style={editorDynamicStyle}
										// Dodanie obsługi klawiszy bezpośrednio w PlateContent
										onBlur={() => {
											// Only sync on blur for better performance
											// Convert plate value to text or appropriate format for the form
											const plateValueToText = (plateValue: Value): string => {
												if (
													!plateValue ||
													!Array.isArray(plateValue) ||
													plateValue.length === 0
												)
													return "";

												// Prostą implementacja - łączymy tekst ze wszystkich węzłów
												return plateValue
													.map((node) => {
														if (typeof node.text === "string") return node.text;

														// Rekurencyjnie pobieramy tekst z dzieci
														if (node.children && Array.isArray(node.children)) {
															return node.children
																.map((child) =>
																	typeof child.text === "string"
																		? child.text
																		: "",
																)
																.join("");
														}

														return "";
													})
													.join("\n");
											};

											// Update form value only on blur for better performance
											field.onChange(editor.children);
											field.onBlur();
										}}
										onKeyDown={(e: React.KeyboardEvent) => {
											// W trybie jednoliniowym blokujemy Enter całkowicie
											if (e.key === "Enter" && singleLine) {
												e.preventDefault();
												return;
											}

											// Shift+Enter zawsze wstawia nową linię (ale nie w trybie singleLine)
											if (e.key === "Enter" && e.shiftKey && !singleLine) {
												return;
											}

											// Obsługa klawisza Tab (wcięcie)
											if (e.key === "Tab") {
												e.preventDefault();
												// Bezpieczniejsze wstawianie tekstu przez edytor
												if (editor && typeof editor.insertText === "function") {
													editor.insertText("  ");
												}
											}

											// Jeśli formularz nie ma wielu linii, Enter powinien przesłać formularz
											if (e.key === "Enter" && !e.shiftKey && !maxLength) {
												e.preventDefault();
												// Tutaj możesz dodać logikę wysyłania formularza
												// form.handleSubmit(onSubmit)();
											}
										}}
									/>

									{/* Character counter rendered inside Plate context */}
									{maxLength && (
										<PlateContentLength maxLength={maxLength} editorId={id} />
									)}
								</div>
							</Plate>
						</FormControl>
						{description && <FormDescription>{description}</FormDescription>}
						<FormMessage />
					</FormItem>
				);
			}}
		/>
	);
}
