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
	} = guildData;

	const totalChannels =
		category_count + text_channel_count + voice_channel_count;

	const { userData: ownerData, status: ownerStatus } = useGetUser(
		guild_details.owner_id,
	);

	return (
		<Card className="overflow-hidden">
			<CardContent className="p-0">
				<div className="flex items-center p-6 bg-muted">
					<Avatar className="h-20 w-20 mr-6">
						<AvatarImage
							src={avatarUrl(guild_details.id, guild_details.icon, 128, false)}
							alt={guild_details.name}
						/>
						<AvatarFallback>{guild_details.name}</AvatarFallback>
					</Avatar>
					<div>
						<h2 className="text-2xl font-bold">{guild_details.name}</h2>
						<p className="text-sm text-muted-foreground">
							Created on {new Date().toLocaleString()}
						</p>
						<div className="flex items-center mt-2 text-sm text-muted-foreground">
							<Crown className="w-4 h-4 mr-1" />
							{ownerStatus === "loading"
								? "Loading..."
								: ownerData
									? ownerData.username
									: "Owner not found"}
						</div>
					</div>
					<div className="ml-auto text-right uppercase">
						{guild_details.region}
						<div className="flex flex-wrap justify-end gap-1 mt-2">
							{guild_details.features.includes("COMMUNITY") && (
								<Badge variant="outline" className="text-xs">
									Community
								</Badge>
							)}
						</div>
					</div>
				</div>
				<div className="grid grid-cols-3 divide-x">
					<div className="p-4 text-center">
						<Users className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
						<p className="text-2xl font-bold">
							{guild_details.approximate_member_count}
						</p>
						<p className="text-xs text-muted-foreground">Members</p>
					</div>
					<div className="p-4 text-center">
						<Hash className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
						<p className="text-2xl font-bold">{totalChannels}</p>
						<p className="text-xs text-muted-foreground">Channels</p>
					</div>
					<div className="p-4 text-center">
						<MessageSquare className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
						<p className="text-2xl font-bold">{rolesCount}</p>
						<p className="text-xs text-muted-foreground">Roles</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
