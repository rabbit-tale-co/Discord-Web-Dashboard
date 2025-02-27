import {
	Server,
	Sparkles,
	Bell,
	BadgeCheck,
	CreditCard,
	LogOut,
} from "lucide-react";
import {
	DropdownMenuItem,
	DropdownMenuGroup,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenu,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useAuth } from "@/context/authContext";
import { useSidebar } from "./navigation/sidebar";
import { UserInfo } from "./user-info";

import { SidebarMenuButton } from "./navigation/sidebar";
import { Button } from "./ui/button";

export function DropDownUser({
	username,
	email,
	avatar,
	id,
	type = "dropdown",
}: {
	username: string;
	email: string;
	avatar: string;
	id: string;
	type?: "sidebar" | "dropdown";
}) {
	const { isMobile } = useSidebar();
	const { logout } = useAuth();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				{type === "sidebar" ? (
					<SidebarMenuButton
						size="lg"
						className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
					>
						<UserInfo
							username={username}
							email={email}
							avatar={avatar || ""}
							id={id}
							type="full"
							size="sm"
						/>
					</SidebarMenuButton>
				) : (
					<Button variant="ghost" className="p-0 max-md:hidden">
						<UserInfo
							username={username}
							email={email}
							avatar={avatar || ""}
							id={id}
							type="avatar"
							hideChevron
						/>
					</Button>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
				// if mobile, show at the bottom
				// if type is dropdown, show at the top
				side={isMobile ? "bottom" : type === "dropdown" ? "bottom" : "right"}
				align="end"
				sideOffset={4}
			>
				<DropdownMenuLabel className="p-0 font-normal">
					<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
						<UserInfo
							username={username}
							email={email}
							avatar={avatar || ""}
							id={id}
							type="full"
							size="sm"
							hideChevron
						/>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<Link href="/servers">
							<Server className="mr-2 h-4 w-4" />
							My Servers
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href="/premium">
							<Sparkles className="mr-2 h-4 w-4" />
							Get Premium
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<BadgeCheck className="mr-2 h-4 w-4" />
						Account
					</DropdownMenuItem>
					<DropdownMenuItem>
						<CreditCard className="mr-2 h-4 w-4" />
						Billing
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Bell className="mr-2 h-4 w-4" />
						Notifications
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href={"#"} onClick={() => logout()}>
						<LogOut className="mr-2 size-4" />
						Log out
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
