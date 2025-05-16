import React from "react";
import type { RenderElementProps } from "slate-react";
import { cn } from "@/lib/utils";
import { useSelected, useFocused } from "slate-react";
import type {
	StarWarsMentionElement,
	SpoilerElement,
} from "@/types/editorTypes";

// Define the MentionType locally if not exported from editorTypes
export type MentionType = "role" | "channel" | "variable";

// Konfiguracja dla typów wzmianek - kolory, ikony, prefiksy bez zależności od stanu komponentu
export const MENTION_TYPE_CONFIG = {
	role: {
		icon: "@",
		style: "bg-blue-100 text-blue-800 border-blue-300",
		prefix: "@",
		ringColor: "ring-blue-500",
	},
	channel: {
		icon: "#",
		style: "bg-green-100 text-green-800 border-green-300",
		prefix: "#",
		ringColor: "ring-green-500",
	},
	variable: {
		icon: "{",
		style: "bg-amber-100 text-amber-800 border-amber-300",
		prefix: "",
		ringColor: "ring-amber-500",
	},
};

// Konfiguracja dla typów wzmianek - kolory, ikony, prefiksy
export const getMentionTypeConfig = (selected: boolean, focused: boolean) => ({
	role: {
		icon: "@",
		style: cn(
			"bg-blue-100 text-blue-800 border-blue-300",
			selected && focused && "ring-2 ring-blue-500",
		),
		prefix: "@",
		ringColor: "ring-blue-500",
	},
	channel: {
		icon: "#",
		style: cn(
			"bg-green-100 text-green-800 border-green-300",
			selected && focused && "ring-2 ring-green-500",
		),
		prefix: "#",
		ringColor: "ring-green-500",
	},
	variable: {
		icon: "{",
		style: cn(
			"bg-amber-100 text-amber-800 border-amber-300",
			selected && focused && "ring-2 ring-amber-500",
		),
		prefix: "",
		ringColor: "ring-amber-500",
	},
});

// Komponent wyświetlający wzmiankę
export const Mention: React.FC<
	RenderElementProps & { element: StarWarsMentionElement }
> = ({ attributes, children, element }) => {
	const selected = useSelected();
	const focused = useFocused();
	const mentionConfig = getMentionTypeConfig(selected, focused);
	const { mentionType } = element;

	// Obsługa specjalnego kanału Channels & Roles
	if (mentionType === "channel" && element.value === "customize") {
		return (
			<span
				{...attributes}
				contentEditable={false}
				data-cy={`mention-${element.value.replace(" ", "-")}`}
				data-mention-type={mentionType}
				data-value={element.value}
				data-display={element.displayValue}
				className={cn(
					"inline-block px-1.5 py-0.5 m-0.5 rounded-md text-sm font-medium border",
					mentionConfig[mentionType as MentionType].style,
				)}
				data-slate-void="true"
				aria-atomic="true"
				role="button"
			>
				<span style={{ display: "none" }}>{children}</span>
				<svg
					className="inline-block size-3.5 mr-1"
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M3 6h18" />
					<path d="M3 12h18" />
					<path d="M3 18h18" />
				</svg>
				{element.displayValue}
			</span>
		);
	}

	// Standardowe renderowanie dla innych typów
	const config = mentionConfig[mentionType as MentionType];
	const displayContent = `${config.prefix} ${element.displayValue}`;

	return (
		<span
			{...attributes}
			contentEditable={false}
			data-cy={`mention-${element.value.replace(" ", "-")}`}
			data-mention-type={mentionType}
			data-value={element.value}
			data-display={element.displayValue}
			className={cn(
				"inline-block px-1.5 py-0.5 m-0.5 rounded-md text-sm font-medium border",
				config.style,
			)}
			data-slate-void="true"
			aria-atomic="true"
			role="button"
		>
			<span style={{ display: "none" }}>{children}</span>
			{displayContent}
		</span>
	);
};

// Komponent wyświetlający spoiler
export const Spoiler: React.FC<
	RenderElementProps & { element: SpoilerElement }
> = ({ attributes, children, element }) => {
	const selected = useSelected();
	const focused = useFocused();
	const textContent = element.children[0].text;

	return (
		<React.Fragment>
			<span className="text-slate-500 mr-0.5">||</span>
			<span
				{...attributes}
				data-slate-void="true"
				className={cn(
					"inline-block px-1.5 py-0.5 rounded-md text-sm relative bg-slate-300/50 text-slate-700 transition-colors",
					selected && focused && "ring-2 ring-blue-300",
				)}
				contentEditable={false}
			>
				<span contentEditable={false}>{textContent}</span>
				{children}
			</span>
			<span className="text-slate-500 ml-0.5">||</span>
		</React.Fragment>
	);
};

// Komponent placeholder dla wzmianki
export const MentionPlaceholder: React.FC<
	RenderElementProps & { element: { mentionType: string } }
> = ({ attributes, children, element }) => {
	const selected = useSelected();
	const focused = useFocused();
	const mentionConfig = getMentionTypeConfig(selected, focused);
	const mentionType = element.mentionType as MentionType;

	return (
		<span
			{...attributes}
			contentEditable={false}
			className={cn(
				"inline-block px-1.5 py-0.5 m-0.5 rounded-md text-sm font-medium border border-dashed",
				mentionConfig[mentionType].style,
			)}
			data-slate-void="true"
		>
			<span style={{ display: "none" }}>{children}</span>
			{mentionConfig[mentionType].icon}
		</span>
	);
};

// Główny komponent wybierający odpowiedni renderer na podstawie typu elementu
const Element: React.FC<RenderElementProps> = ({
	attributes,
	children,
	element,
}) => {
	switch (element.type) {
		case "mention":
			return (
				<Mention
					{...({ attributes, children, element } as RenderElementProps & {
						element: StarWarsMentionElement;
					})}
				/>
			);
		case "spoiler":
			return (
				<Spoiler
					{...({ attributes, children, element } as RenderElementProps & {
						element: SpoilerElement;
					})}
				/>
			);
		case "mention-placeholder":
			return (
				<MentionPlaceholder
					{...({ attributes, children, element } as RenderElementProps & {
						element: { mentionType: string };
					})}
				/>
			);
		default:
			return <p {...attributes}>{children}</p>;
	}
};

export default Element;
