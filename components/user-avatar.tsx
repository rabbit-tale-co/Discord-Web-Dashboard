"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/app/authContext";
import type { SessionData } from "@/types/index";

export const UserAvatar = ({ user }: { user: SessionData["user"] }) => {
	const { logout } = useAuth();

	const isGif = user.avatar.startsWith("a_");
	const avatarUrl = isGif
		? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.gif`
		: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp`;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Avatar
					//tabIndex={0} TODO: open dropdown on focus
					className="cursor-pointer group"
				>
					<AvatarImage
						src={avatarUrl}
						className="group-hover:scale-110 transition-all duration-300"
					/>
					<AvatarFallback>{user.username.slice(0, 2)}</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem>Settings</DropdownMenuItem>
				<DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
