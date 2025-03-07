import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/hooks/use-user";
import avatarUrl from "@/lib/is-gif";
import type { GuildData } from "@/hooks/use-guilds";
import * as React from "react";
import type { ReactElement } from "react";

interface UserData {
	id: string;
	username?: string;
	avatar: string | null;
	displayName?: string;
}

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

interface MentionProps {
	children: React.ReactNode;
}

const Mention: React.FC<MentionProps> = ({ children }) => (
	<span className="text-[#5865F2] bg-[#5865F21A] rounded px-1">{children}</span>
);

function parseText(
	text: string,
	guildData: GuildData,
	userData: UserData | null,
): (string | ReactElement)[] {
	if (!text) return [];

	console.log("userData", userData);

	const parts: (string | ReactElement)[] = [];
	let currentIndex = 0;

	// Regular expressions for different patterns
	const patterns = [
		{
			regex: /<@!?(\d+)>/g, // Match both <@user_id> and <@!user_id> formats for user mentions
			process: (id: string) => {
				// If the ID matches the current user's ID, use their username
				if (userData && String(userData.id) === String(id)) {
					return (
						<Mention key={`user-${id}`}>@{userData.username || "User"}</Mention>
					);
				}

				// Without members data, we can only show a generic user mention
				return <Mention key={`user-${id}`}>@User</Mention>;
			},
		},
		{
			regex: /<@&(\d+)>/g, // Match role mentions with format <@&role_id>
			process: (id: string) => {
				// Compare string representation of IDs to avoid type mismatches
				const role = guildData?.roles?.find((r) => String(r.id) === String(id));

				return (
					<Mention key={`role-${id}`}>@{role?.name || "Unknown Role"}</Mention>
				);
			},
		},
		{
			regex: /<#(\d+)>/g,
			process: (id: string) => {
				// Compare as strings to avoid type mismatches
				const channel = guildData?.channels?.find(
					(c) => String(c.id) === String(id),
				);
				return (
					<Mention key={`channel-${id}`}>
						#{channel?.name || "unknown-channel"}
					</Mention>
				);
			},
		},
		{
			regex: /<id:customize>/g,
			process: () => <Mention key="customize">Channels & Roles</Mention>,
		},
		{
			regex: /{user}/g,
			process: () => (
				<Mention key="user">
					@{userData?.displayName || userData?.username || "Bot"}
				</Mention>
			),
		},
		{
			regex: /{username}/g,
			process: () => {
				console.log("userData", userData);
				return <span key="username">{userData?.username || "Bot"}</span>;
			},
		},
		{
			regex: /{server_name}/g,
			process: () => (
				<span key="server_name">
					{guildData?.guild_details?.name || "Server"}
				</span>
			),
		},
	];

	for (const pattern of patterns) {
		let matchResult: RegExpExecArray | null = pattern.regex.exec(text);
		while (matchResult !== null) {
			// Add text before the match
			if (matchResult.index > currentIndex) {
				parts.push(text.slice(currentIndex, matchResult.index));
			}
			// Add the processed element
			parts.push(pattern.process(matchResult[1]));
			currentIndex = matchResult.index + matchResult[0].length;
			matchResult = pattern.regex.exec(text);
		}
	}

	// Add remaining text
	if (currentIndex < text.length) {
		parts.push(text.slice(currentIndex));
	}

	return parts;
}

export function EmbedPreview({ embed, guildData }: EmbedPreviewProps) {
	const { userData } = useUser(process.env.NEXT_PUBLIC_BOT_ID as string);

	// Debug log to check guildData
	// console.log("EmbedPreview guildData:", guildData);
	// console.log("Roles available:", guildData?.roles);

	return (
		<div className="border rounded-lg p-4 bg-zinc-50">
			<div className="space-y-4">
				<div className="flex items-start gap-4">
					<Avatar>
						<AvatarImage
							src={avatarUrl(
								userData?.id || "",
								userData?.avatar || "",
								128,
								true,
							)}
						/>
						<AvatarFallback>{userData?.username?.charAt(0)}</AvatarFallback>
					</Avatar>
					<div className="flex-1">
						<div className="flex items-baseline gap-2">
							<span className="font-medium">{userData?.username || "Bot"}</span>
							<span className="text-sm text-zinc-500">
								Today at {new Date().toLocaleTimeString()}
							</span>
						</div>
						<div
							className="mt-2 border-l-4 rounded border-blue-500 bg-white p-4"
							style={{
								borderColor: embed?.color
									? `#${embed.color.toString(16).padStart(6, "0")}`
									: "#5865F2",
							}}
						>
							{embed && (
								<React.Fragment>
									{embed.title && (
										<div className="font-semibold mb-2">
											{parseText(embed.title, guildData, userData)}
										</div>
									)}
									{embed.description && (
										<div className="text-sm text-zinc-800">
											{parseText(embed.description, guildData, userData)}
										</div>
									)}
									{embed.fields && embed.fields.length > 0 && (
										<div className="grid grid-cols-2 gap-4 mt-4">
											{embed.fields.map((field, index) => (
												<div
													key={`${field.name}-${field.value}-${index}`}
													className={field.inline ? "col-span-1" : "col-span-2"}
												>
													<div className="font-semibold text-sm">
														{parseText(field.name, guildData, userData)}
													</div>
													<div className="text-sm text-zinc-600">
														{parseText(field.value, guildData, userData)}
													</div>
												</div>
											))}
										</div>
									)}
									{embed.footer?.text && (
										<div className="mt-4 text-xs text-zinc-500">
											{parseText(embed.footer.text, guildData, userData)}
										</div>
									)}
								</React.Fragment>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
