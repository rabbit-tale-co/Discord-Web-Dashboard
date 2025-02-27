"use client";

import * as Icon from "@/components/icons";
import { login } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { NavUser } from "@/components/dashbaord/nav-user";
import { useAuth } from "@/context/authContext";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
} from "@/components/navigation/sidebar";
import { NavMainMobile } from "@/components/dashbaord/nav-main";

export function SidebarMobile({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const { user } = useAuth();

	return (
		<Sidebar {...props} target="mobile">
			<SidebarContent>
				<NavMainMobile />
			</SidebarContent>
			<SidebarFooter>
				{user ? (
					<NavUser user={user} />
				) : (
					<Button
						variant="discord"
						size="lg"
						className="w-full"
						onClick={() => login()}
					>
						Login with Discord
						<Icon.SolidDiscord size={22} />
					</Button>
				)}
			</SidebarFooter>
		</Sidebar>
	);
}
