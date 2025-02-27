"use client";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/navigation/sidebar";
import { NavUser } from "./nav-user";
import { NavMain } from "./nav-main";
import { ServerSwitcher } from "./server-switcher";
import { useGuild, useGuilds } from "@/hooks/use-guilds";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/authContext";
import { useNavigationConfig } from "../navigation/config";
import React from "react";
import { useServerPlugins } from "@/context/plugins-context";

export function DashboardSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const { user } = useAuth();
	const params = useParams();
	const guildId = params.id as string;
	const { guildData } = useGuild(guildId);
	const { guilds } = useGuilds();

	const { pluginsData, lastUpdated } = useServerPlugins();

	const navigationConfig = useNavigationConfig(pluginsData);
	const pluginsSection = React.useMemo(
		() => navigationConfig.find((section) => section.title === "Plugins"),
		[navigationConfig],
	);

	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<ServerSwitcher servers={guilds} />
			</SidebarHeader>
			<SidebarContent key={`content-${guildId}-${lastUpdated}`}>
				{guildData && pluginsSection && (
					<NavMain
						key={`nav-${guildId}-${lastUpdated}`}
						guildId={guildData.guild_details.id}
						section={pluginsSection}
					/>
				)}
			</SidebarContent>
			<SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
