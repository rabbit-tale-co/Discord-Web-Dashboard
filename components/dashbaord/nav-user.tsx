"use client";

import {
	BadgeCheck,
	Bell,
	ChevronsUpDown,
	CreditCard,
	LogOut,
	Server,
	Sparkles,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/navigation/sidebar";
import Link from "next/link";
import type { UserData } from "@/hooks/use-user";
import { useAuth } from "@/app/authContext";

interface NavUserProps {
	user?: UserData | null;
}

export function NavUser({ user }: NavUserProps) {
	const { isMobile } = useSidebar();
	const { logout } = useAuth();

	if (!user) return null;

	const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="size-8 rounded-lg">
								<AvatarImage src={avatarUrl} alt={user.username} />
								<AvatarFallback className="rounded-lg">
									{user.username.substring(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">{user.username}</span>
								<span className="truncate text-xs">
									{user.email || `#${user.id}`}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="size-8 rounded-lg">
									<AvatarImage src={avatarUrl} alt={user.username} />
									<AvatarFallback className="rounded-lg">
										{user.username.substring(0, 2).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{user.username}
									</span>
									<span className="truncate text-xs">
										{user.email || `#${user.id}`}
									</span>
								</div>
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
								<LogOut className="mr-2 h-4 w-4" />
								Log out
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
