"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getUser } from "@/hooks/use-user";
import avatarUrl from "@/lib/is-gif";
import type { GuildData } from "@/types/guild";
import { MentionRenderer } from "@/components/ui/mention";
import type { ExtendedGuildData } from "@/components/ui/mention";
import { cn } from "@/lib/utils";
import { CheckIcon, ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type * as Discord from "discord.js";
import Image from "next/image";

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
		thumbnail?: {
			url: string;
		};
		image?: {
			url: string;
		};
	} | null;
	guildData: GuildData;
}

/**
 * Component to preview Discord embeds with mentions support
 */
export function EmbedPreview({ embed, guildData }: EmbedPreviewProps) {
	const [userData, setUserData] = useState<Discord.User | null>(null);

	useEffect(() => {
		const fetchUser = async () => {
			const botId = process.env.NEXT_PUBLIC_BOT_ID;
			if (!botId) {
				console.error("Bot ID is not defined");
				return;
			}
			const response = await getUser(botId);
			if (response) {
				const user = response as unknown as Discord.User;
				setUserData(user);
			} else {
				console.error("Failed to fetch bot user data");
			}
		};
		fetchUser();
	}, []);

	if (!embed) return null;

	// Helper function to format text variables
	const formatTextVariables = (text: string) => {
		return text.replace(/{(.*?)}/g, (match, variable) => {
			switch (variable) {
				case "server_name":
					return guildData?.name || "Server";
				case "server_id":
					return guildData?.id || "Unknown";
				case "member_count":
					return (
						guildData?.guild_details?.approximate_member_count?.toString() ||
						"0"
					);
				default:
					return match;
			}
		});
	};

	// Helper function to parse text with mentions using the centralized MentionRenderer
	const parseWithGuildData = (text: string) => {
		// First format any text variables
		const formattedText = formatTextVariables(text);

		// Transform userData to the format expected by MentionRenderer
		const mentionUserData = userData
			? {
					id: userData.id.toString(),
					username: userData.username,
					displayName: userData.displayName,
					avatar: userData.avatar || null,
				}
			: undefined;

		// Extend guildData with user data if available
		const extendedGuildData: ExtendedGuildData = {
			...guildData,
			users: [],
		};

		return (
			<MentionRenderer
				content={formattedText}
				guildData={extendedGuildData}
				userData={mentionUserData}
				mentionTypes={["user", "role", "channel"]}
			/>
		);
	};

	console.log("embed thumbnail url", embed.thumbnail?.url);

	// Helper function to resolve image URL variables
	const resolveImageUrl = (url: string) => {
		// Handle special variables
		if (url.startsWith("{") && url.endsWith("}")) {
			const variable = url.slice(1, -1);
			switch (variable) {
				case "server_image": {
					if (!guildData?.guild_details?.icon) {
						console.log("No server icon available");
						return null;
					}
					const iconUrl = avatarUrl(
						guildData.id,
						guildData.guild_details.icon,
						1024,
						false,
					);
					console.log("Generated server image URL:", iconUrl);
					return iconUrl;
				}
				case "server_banner": {
					if (!guildData?.guild_details?.banner) {
						console.log("No server banner available");
						return null;
					}
					const bannerUrl = avatarUrl(
						guildData.id,
						guildData.guild_details.banner,
						1024,
						false,
					);
					console.log("Generated server banner URL:", bannerUrl);
					return bannerUrl;
				}
				case "avatar": {
					if (!userData?.id || !userData?.avatar) {
						console.log("No bot avatar available");
						return null;
					}
					const userAvatarUrl = avatarUrl(
						userData.id,
						userData.avatar,
						1024,
						true,
					);
					console.log("Generated bot avatar URL:", userAvatarUrl);
					return userAvatarUrl;
				}
				default:
					console.log("Unknown variable:", variable);
					return null;
			}
		}

		// Handle direct URLs
		if (url.startsWith("http")) {
			return url;
		}

		// Handle avatar hash
		if (url.match(/^[a-f0-9]+$/i) && userData?.id) {
			return avatarUrl(userData.id, url, 1024, true);
		}

		console.log("Could not resolve URL:", url);
		return null;
	};

	// Calculate color for embed display
	const color = embed.color
		? `#${embed.color.toString(16).padStart(6, "0")}`
		: "#1e40af";

	// Calculate grid columns based on inline fields
	const gridCols = embed.fields?.some((field) => field.inline)
		? "grid-cols-2"
		: "grid-cols-1";

	// Get bot's avatar URL

	if (!userData) return null;

	const botAvatarUrl = avatarUrl(userData.id, userData.avatar, 128, true);

	return (
		<div className="flex flex-col gap-2 rounded-lg bg-[#FFFFFF] p-4 text-[#313338]">
			{/* Message container with avatar and content */}
			<div className="flex gap-4">
				{/* Avatar */}
				<div className="flex-shrink-0">
					<Avatar className="size-10 rounded-full">
						<AvatarImage
							src={botAvatarUrl}
							onError={(e) => {
								console.error("Avatar failed to load:", botAvatarUrl);
								e.currentTarget.style.display = "none";
							}}
						/>
						<AvatarFallback>
							{userData.username.slice(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
				</div>

				{/* Message content */}
				<div className="flex flex-col flex-1">
					{/* Username and bot tag */}
					<div className="flex items-center gap-1 mb-1">
						<span className="font-medium text-[#060607]">
							{userData?.displayName || userData?.username || "Bot"}
						</span>
						<span className="rounded bg-[#5865F2] flex items-center gap-1 px-[0.275rem] py-[0.15rem] text-[0.625rem] font-medium leading-[0.875rem] text-white">
							<CheckIcon className="size-3" />
							APP
						</span>
					</div>

					{/* Embed container */}
					<div className="relative flex flex-col rounded-tr-sm rounded-br-sm bg-[#F2F3F5] text-[#2E3338]">
						<div className="flex gap-4 p-4">
							{/* Left border color indicator */}
							<div
								className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
								style={{ backgroundColor: color }}
							/>

							{/* Main content */}
							<div className="flex-1 pl-3">
								<div className="flex gap-4">
									{/* Title and description container */}
									<div className="flex-1">
										{/* Title */}
										{embed.title && (
											<div className="mb-2">
												<h3 className="font-semibold text-[#060607]">
													{parseWithGuildData(embed.title)}
												</h3>
											</div>
										)}

										{/* Description */}
										{embed.description && (
											<div className="mb-3 text-sm leading-[1.375rem]">
												{parseWithGuildData(embed.description)}
											</div>
										)}

										{/* Fields */}
										{embed.fields && embed.fields.length > 0 && (
											<div
												className={cn(
													"mb-3 grid gap-4",
													gridCols,
													"[&>*:last-child]:col-span-full",
												)}
											>
												{embed.fields.map((field) => (
													<div
														key={`${field.name}-${field.value}`}
														className={cn(
															"min-w-[100px]",
															field.inline ? "" : "col-span-full",
														)}
													>
														{field.name && (
															<h4 className="mb-1 text-xs font-semibold text-[#060607]">
																{parseWithGuildData(field.name)}
															</h4>
														)}
														{field.value && (
															<div className="text-sm leading-[1.375rem]">
																{parseWithGuildData(field.value)}
															</div>
														)}
													</div>
												))}
											</div>
										)}

										{/* Image */}
										{embed.image?.url ? (
											<div className="flex-shrink-0">
												{(() => {
													console.log(`embed.image.url: ${embed.image.url}`);
													const imageUrl = resolveImageUrl(embed.image.url);
													return imageUrl ? (
														<Image
															src={imageUrl}
															alt="Image"
															width={400}
															height={300}
															className="max-h-[300px] w-auto rounded-md object-cover"
															onError={(e) => {
																e.currentTarget.style.fontSize = "0";
															}}
														/>
													) : (
														<div className="flex h-[300px] w-[400px] items-center justify-center rounded-md border-2 border-dashed border-[#E3E5E8] bg-[#FFFFFF]">
															<ImageIcon className="h-12 w-12 text-[#E3E5E8]" />
														</div>
													);
												})()}
											</div>
										) : (
											<div className="flex h-[300px] w-[400px] items-center justify-center rounded-md border-2 border-dashed border-[#E3E5E8] bg-[#FFFFFF]">
												<ImageIcon className="h-12 w-12 text-[#E3E5E8]" />
											</div>
										)}

										{/* Footer */}
										{embed.footer?.text && (
											<div className="mt-2 flex items-center gap-2 text-xs text-[#949BA4]">
												{embed.footer.text &&
													parseWithGuildData(embed.footer.text)}
											</div>
										)}
									</div>

									{/* Right side content: Main Image and Thumbnail */}
									<div className="flex flex-col gap-4">
										{/* Thumbnail */}
										{embed.thumbnail?.url ? (
											<div className="flex-shrink-0">
												{(() => {
													console.log(
														"Processing thumbnail URL:",
														embed.thumbnail.url,
													);
													const thumbnailUrl = resolveImageUrl(
														embed.thumbnail.url,
													);
													console.log("Resolved thumbnail URL:", thumbnailUrl);
													return thumbnailUrl ? (
														<Image
															src={thumbnailUrl}
															alt="Thumbnail"
															width={80}
															height={80}
															className="size-20 rounded-md object-cover"
															onError={(e) => {
																console.error(
																	"Thumbnail failed to load:",
																	thumbnailUrl,
																);
																e.currentTarget.style.display = "none";
															}}
														/>
													) : (
														<div className="flex size-20 items-center justify-center rounded-md border-2 border-dashed border-[#E3E5E8] bg-[#FFFFFF]">
															<ImageIcon className="size-8 text-[#E3E5E8]" />
														</div>
													);
												})()}
											</div>
										) : null}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
