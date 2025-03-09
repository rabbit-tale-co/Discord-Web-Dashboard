import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/hooks/use-user";
import avatarUrl from "@/lib/is-gif";
import type { GuildData } from "@/types/guild";
import type { ReactNode } from "react";
import { MentionRenderer } from "@/components/ui/mention";
import type { ExtendedGuildData } from "@/components/ui/mention";

/**
 * Interface representing user data for mentions
 */
interface UserData {
	id: string;
	username?: string;
	avatar: string | null;
	displayName?: string;
	discriminator?: string;
	users?: Array<{ id: string; username: string }>;
}

/**
 * Interface for embed preview component props
 */
interface EmbedPreviewProps {
	embed: {
		color?: number;
		title?: string;
		description?: string;
		fields?: Array<{
			name: string;
			value: string;
			inline?: boolean;
		}>;
		footer?: {
			text: string;
		};
	} | null;
	guildData: GuildData;
}

/**
 * Component to preview Discord embeds with mentions support
 */
export function EmbedPreview({ embed, guildData }: EmbedPreviewProps) {
	const { userData } = useUser(process.env.NEXT_PUBLIC_BOT_ID as string);

	if (!embed) return null;

	// Helper function to parse text with mentions using the centralized MentionRenderer
	const parseWithGuildData = (text: string) => {
		// Przekształć userData do formatu oczekiwanego przez MentionRenderer
		const mentionUserData = userData
			? {
					id: userData.id,
					username: userData.username,
					displayName: userData.displayName,
					avatar: userData.avatar || null,
				}
			: undefined;

		// Uzupełnij guildData o dane użytkowników, jeśli są dostępne
		const extendedGuildData: ExtendedGuildData = {
			...guildData,
			// Ponieważ userData.users może nie istnieć w typie User, używamy pustej tablicy jako fallback
			users: [],
		};

		return (
			<MentionRenderer
				content={text}
				guildData={extendedGuildData}
				userData={mentionUserData}
				mentionTypes={["user", "role", "channel"]}
			/>
		);
	};

	// Calculate color for embed display
	const color = embed.color
		? `#${embed.color.toString(16).padStart(6, "0")}`
		: "#1e40af";

	return (
		<div className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
			{/* Embed Color Indicator */}
			<div className="flex items-start gap-2">
				<div
					className="h-full w-1 rounded"
					style={{ backgroundColor: color }}
				/>

				{/* Main Embed Content */}
				<div className="flex-1 overflow-hidden">
					{/* Title */}
					{embed.title && (
						<h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
							{parseWithGuildData(embed.title)}
						</h3>
					)}

					{/* Description */}
					{embed.description && (
						<div className="mb-3 text-sm text-gray-800 dark:text-gray-200">
							{parseWithGuildData(embed.description)}
						</div>
					)}

					{/* Fields */}
					{embed.fields && embed.fields.length > 0 && (
						<div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-2">
							{embed.fields.map((field, idx) => (
								<div
									key={`field-${field.name || ""}-${idx}`}
									className={`${field.inline ? "col-span-1" : "col-span-full"}`}
								>
									{field.name && (
										<h4 className="mb-1 text-xs font-semibold text-gray-800 dark:text-gray-200">
											{parseWithGuildData(field.name)}
										</h4>
									)}
									{field.value && (
										<div className="text-xs text-gray-600 dark:text-gray-300">
											{parseWithGuildData(field.value)}
										</div>
									)}
								</div>
							))}
						</div>
					)}

					{/* Footer */}
					{embed.footer?.text && (
						<div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
							{parseWithGuildData(embed.footer.text)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
