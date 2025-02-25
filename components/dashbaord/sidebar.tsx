"use client";

import type { NavSection } from "@/types/navigation";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/navigation/sidebar";
import { navigationConfig } from "../navigation/config";
import { NavUser } from "./nav-user";

import { NavMain, NavMainMobile } from "./nav-main";
import { ServerSwitcher } from "./server-switcher";
import { useGuild, useGuilds } from "@/hooks/use-guilds";
import { useParams } from "next/navigation";
import { useAuth } from "@/app/authContext";
import { Button } from "@/components/ui/button";
import * as Icon from "@/components/icons";
import { login } from "@/hooks/use-user";

const plugins: NavSection = {
	title: "Plugins",
	iconName: "SolidLogo",
	categories:
		navigationConfig.find((item) => item.title === "Plugins")?.categories || [],
};

export function DashboardSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const { user } = useAuth();
	const params = useParams();
	const { guildData } = useGuild(params.id as string);
	const { guilds, status } = useGuilds();

	// Don't render anything if we're loading or missing essential data
	if (status === "loading") return null;

	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<ServerSwitcher servers={guilds || []} />
			</SidebarHeader>
			<SidebarContent>
				{guildData && (
					<NavMain guildId={guildData.guild_details.id} section={plugins} />
				)}
				{/* <NavProjects projects={data.projects} /> */}
			</SidebarContent>
			<SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
