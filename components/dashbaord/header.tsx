"use client";

import { useGuild } from "@/hooks/use-guilds";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import * as Icon from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import avatarUrl from "@/lib/is-gif";
import { SidebarTrigger } from "../ui/sidebar";

export function DashboardHeader() {
	const { id } = useParams();
	const { guild } = useGuild(id as string);
	const guildIcon = guild?.icon
		? avatarUrl(guild.id, guild.icon, 128, false)
		: "/images/discord-logo.png";

	return (
		<header className="bg-background/80 w-full flex items-center backdrop-blur-sm border-b py-2">
			<div className="container mx-auto">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Avatar>
							<AvatarImage src={guildIcon} className="rounded-full size-10" />
							<AvatarFallback>{guild?.name.slice(0, 2)}</AvatarFallback>
						</Avatar>
						<h1 className="text-2xl font-bold">{guild?.name}</h1>
					</div>
					<Button variant={"secondary"} size={"lg"}>
						Settings
						<Icon.SolidLogo className="size-4" />
					</Button>
				</div>
			</div>
		</header>
	);
}
