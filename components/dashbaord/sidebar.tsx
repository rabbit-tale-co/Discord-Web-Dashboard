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
import Link from "next/link";

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

export function SidebarMobile({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const { user } = useAuth();

	return (
		<Sidebar {...props} target="mobile">
			{/* <SidebarHeader>
				<ServerSwitcher servers={guilds || []} />
			</SidebarHeader> */}
			<SidebarContent>
				<NavMainMobile />
			</SidebarContent>
			<SidebarFooter>
				{user ? (
					<NavUser user={user} />
				) : (
					<Button variant="discord" size="lg" className="w-full" asChild>
						<Link
							href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_BOT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_DASHBOARD_URL}/api/auth/callback&response_type=code&scope=identify%20email`}
						>
							Login with Discord
							<Icon.SolidDiscord size={22} />
						</Link>
					</Button>
				)}
			</SidebarFooter>
		</Sidebar>
	);
}
