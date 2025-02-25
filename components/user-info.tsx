"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/app/authContext";
import avatarUrl from "@/lib/is-gif";
import {
	ChevronsUpDown,
	LogOut,
	Link,
	Bell,
	CreditCard,
	BadgeCheck,
	Sparkles,
	Server,
} from "lucide-react";
import { SidebarMenuButton, useSidebar } from "./navigation/sidebar";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

interface UserInfoProps {
	username: string;
	avatar: string;
	id: string;
	email: string;
	type: "full" | "short" | "avatar";
	size?: "sm" | "default";
	hideChevron?: boolean;
}

export function UserInfo({
	username,
	avatar,
	id,
	email,
	type,
	size = "default",
	hideChevron = false,
}: UserInfoProps) {
	if (!username || !avatar || !id || !email) return null;

	const sizeMap = {
		sm: "size-8",
		default: "size-10",
	};

	return (
		<div className="flex w-full items-center gap-2">
			{type === "avatar" ? (
				<Avatar className={`${sizeMap[size]} rounded-full`}>
					<AvatarImage src={avatarUrl(id, avatar)} alt={username} />
					<AvatarFallback className="rounded-full">
						{username.substring(0, 2).toUpperCase()}
					</AvatarFallback>
				</Avatar>
			) : type === "full" ? (
				<div className="flex w-full items-center gap-2">
					<Avatar className={`${sizeMap[size]} rounded-full`}>
						<AvatarImage src={avatarUrl(id, avatar)} alt={username} />
						<AvatarFallback className="rounded-full">
							{username.substring(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold">{username}</span>
						<span className="truncate text-xs">{email || `#${id}`}</span>
					</div>
					{!hideChevron && <ChevronsUpDown className="ml-auto size-4" />}
				</div>
			) : (
				// short
				<span className="truncate text-xs">{email || `#${id}`}</span>
			)}
		</div>
	);
}

export function UserInfoDropdown({
	username,
	avatar,
	id,
	email,
}: UserInfoProps) {
	const { logout } = useAuth();
	const { isMobile } = useSidebar();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
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
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
				side={isMobile ? "bottom" : "right"}
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
						<Link href={"/servers"}>
							<Server className="mr-2 size-4" />
							My Servers
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href={"/premium"}>
							<Sparkles className="mr-2 size-4" />
							Get Premium
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<BadgeCheck className="mr-2 size-4" />
						Account
					</DropdownMenuItem>
					<DropdownMenuItem>
						<CreditCard className="mr-2 size-4" />
						Billing
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Bell className="mr-2 size-4" />
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
