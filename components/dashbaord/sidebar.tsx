import type { NavSection } from "@/types/navigation";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";
import { navigationConfig } from "../navigation/config";
import { NavUser } from "./nav-user";

import { NavMain } from "./nav-main";
import { TeamSwitcher } from "./team-switcher";

const plugins: NavSection = {
	title: "Plugins",
	iconName: "SolidLogo",
	categories:
		navigationConfig.find((item) => item.title === "Plugins")?.categories || [],
};

const data = {
	user: {
		name: "shadcn",
		email: "m@example.com",
		avatar: "/avatars/shadcn.jpg",
	},
	teams: [
		{
			name: "Acme Inc",
			logoName: "SolidLogo",
			plan: "Enterprise",
		},
		{
			name: "Acme Corp.",
			logoName: "SolidLogo",
			plan: "Startup",
		},
		{
			name: "Evil Corp.",
			logoName: "SolidLogo",
			plan: "Free",
		},
	],
	plugins: plugins,
	// projects: [
	// 	{
	// 		name: "Design Engineering",
	// 		url: "#",
	// 		icon: Frame,
	// 	},
	// 	{
	// 		name: "Sales & Marketing",
	// 		url: "#",
	// 		icon: PieChart,
	// 	},
	// 	{
	// 		name: "Travel",
	// 		url: "#",
	// 		icon: Map,
	// 	},
	// ],
};

export function DashboardSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<TeamSwitcher teams={data.teams} />
			</SidebarHeader>
			<SidebarContent>
				<NavMain section={data.plugins} />
				{/* <NavProjects projects={data.projects} /> */}
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
