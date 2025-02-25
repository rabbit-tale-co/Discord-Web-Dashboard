"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Hash, Crown } from "lucide-react";
import avatarUrl from "@/lib/is-gif";
import type { GuildData } from "@/hooks/use-guilds";
import { useGetUser } from "@/hooks/use-user";

interface GuildOverviewProps {
	guildData: GuildData & {
		category_count: number;
		text_channel_count: number;
		voice_channel_count: number;
		guild_details: GuildData["guild_details"];
		roles: GuildData["roles"];
		rolesCount: number;
		created_at: string;
	};
}

export function ServerOverview({ guildData }: GuildOverviewProps) {
	const {
		category_count,
		text_channel_count,
		voice_channel_count,
		guild_details,
		roles,
		rolesCount,
		created_at,
	} = guildData;

	const totalChannels =
		category_count + text_channel_count + voice_channel_count;

	const { userData: ownerData, status: ownerStatus } = useGetUser(
		guild_details.owner_id,
	);

	return (
		<Card className="overflow-hidden">
			<CardContent className="p-0">
				<div className="flex flex-col items-center sm:flex-row sm:items-center p-4 sm:p-6 bg-muted gap-4 sm:gap-6">
					<Avatar className="h-16 w-16 sm:h-20 sm:w-20">
						<AvatarImage
							src={avatarUrl(guild_details.id, guild_details.icon, 128, false)}
							alt={guild_details.name}
						/>
						<AvatarFallback>{guild_details.name}</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0 text-center sm:text-left">
						<h2 className="text-xl sm:text-2xl font-bold truncate">
							{guild_details.name}
						</h2>
						<p className="text-xs sm:text-sm text-muted-foreground">
							Created on {new Date(created_at).toLocaleString()}
						</p>
						<div className="flex items-center justify-center sm:justify-start mt-2 text-xs sm:text-sm text-muted-foreground">
							<Crown className="w-4 h-4 mr-1" />
							{ownerStatus === "loading"
								? "Loading..."
								: ownerData
									? ownerData.username
									: "Owner not found"}
						</div>
					</div>
					<div className="w-full sm:w-auto sm:ml-auto text-center sm:text-right uppercase text-sm">
						{guild_details.region}
						<div className="flex flex-wrap justify-center sm:justify-end gap-1 mt-2">
							{guild_details.features.includes("COMMUNITY") && (
								<Badge variant="outline" className="text-xs">
									Community
								</Badge>
							)}
						</div>
					</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
					<div className="flex flex-col items-center justify-center p-6 text-center">
						<Users className="w-6 h-6 mb-3 text-muted-foreground" />
						<p className="text-xl sm:text-2xl font-bold">
							{guild_details.approximate_member_count}
						</p>
						<p className="text-xs text-muted-foreground mt-1">Members</p>
					</div>
					<div className="flex flex-col items-center justify-center p-6 text-center">
						<Hash className="w-6 h-6 mb-3 text-muted-foreground" />
						<p className="text-xl sm:text-2xl font-bold">{totalChannels}</p>
						<p className="text-xs text-muted-foreground mt-1">Channels</p>
					</div>
					<div className="flex flex-col items-center justify-center p-6 text-center">
						<MessageSquare className="w-6 h-6 mb-3 text-muted-foreground" />
						<p className="text-xl sm:text-2xl font-bold">{rolesCount}</p>
						<p className="text-xs text-muted-foreground mt-1">Roles</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
