"use client";
import { SidebarMenu, SidebarMenuItem } from "@/components/navigation/sidebar";
import type * as Discord from "discord.js";
import { DropDownUser } from "../drop-down-user";

interface User extends Discord.User {
	email: string;
}

interface NavUserProps {
	user?: User | null;
}

export function NavUser({ user }: NavUserProps) {
	if (!user) return null;

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropDownUser
					username={user.username}
					email={user.email}
					avatar={user.avatar || ""}
					id={user.id}
					type="sidebar"
				/>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
