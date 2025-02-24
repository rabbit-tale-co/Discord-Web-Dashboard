"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import * as Icon from "@/components/icons";
import type { NavItem } from "@/types/navigation";
import type { UserSession } from "@/app/authContext";
import { useAuth } from "@/app/authContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
	DropdownMenu,
	DropdownMenuItem,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import { navigationConfig } from "./config";

// Add this type helper
type IconName = keyof typeof Icon;

export function MobileNav({ user }: { user?: UserSession }) {
	const [open, setOpen] = React.useState(false);
	const [openItems, setOpenItems] = React.useState<string[]>([]);
	const { logout } = useAuth();

	const isGif = user?.avatar?.startsWith("a_");
	const avatarUrl = user?.avatar
		? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}${
				isGif ? ".gif" : ".webp"
			}`
		: undefined;

	const toggleItem = (title: string) => {
		setOpenItems((prev) =>
			prev.includes(title)
				? prev.filter((item) => item !== title)
				: [...prev, title],
		);
	};

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" className="lg:hidden">
					<Icon.OutlineMenu className="h-5 w-5" />
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-[300px] p-0 flex flex-col">
				<SheetTitle className="border-b flex p-4">
					<Button variant="ghost" className="w-full justify-start gap-2">
						<Icon.SolidLogo className="h-10 w-10" />
						<div className="flex flex-col items-start gap-0.5">
							<span className="font-semibold">
								{process.env.NEXT_PUBLIC_BOT_NAME}
							</span>
							<span className="text-xs text-muted-foreground">
								{user?.verified ? "Verified" : "Free"}
							</span>
						</div>
					</Button>
				</SheetTitle>

				<div className="flex-1 overflow-auto">
					<div className="space-y-1 p-2">
						{navigationConfig.map((item: NavItem) => (
							<div key={item.title}>
								<Button
									variant="ghost"
									className="w-full justify-start gap-2"
									onClick={() => item.items && toggleItem(item.title)}
								>
									{(() => {
										const IconComponent = Icon[item.iconName as IconName];
										return IconComponent ? (
											<IconComponent className="h-5 w-5" />
										) : null;
									})()}
									{item.title}
									{item.items && (
										<Icon.OutlineArrowRight
											className={cn(
												"ml-auto size-4 transition-transform",
												openItems.includes(item.title) && "rotate-90",
											)}
										/>
									)}
								</Button>
								{item.items && openItems.includes(item.title) && (
									<div className="ml-4 space-y-1">
										{item.items.map((subItem) => (
											<Button
												key={subItem.title}
												variant="ghost"
												className="w-full justify-start pl-6"
												asChild
											>
												<Link href={subItem.url || ""}>
													<span>{subItem.title}</span>
												</Link>
											</Button>
										))}
									</div>
								)}
							</div>
						))}
					</div>
				</div>

				{user ? (
					<div className="border-t p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								{user.avatar ? (
									<Avatar>
										<AvatarImage src={avatarUrl} alt={user.username} />
										<AvatarFallback>{user.username[0]}</AvatarFallback>
									</Avatar>
								) : (
									<User className="h-8 w-8" />
								)}
								<div className="flex flex-col">
									<span className="font-medium">{user.global_name}</span>
									<span className="text-xs text-muted-foreground">
										{user.email}
									</span>
								</div>
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon">
										<Icon.OutlineArrowRight className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem asChild>
										<Link href="/servers">My Servers</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={() => logout()}>
										Logout
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				) : (
					<div className="border-t p-4">
						<Button
							variant="discord"
							asChild
							className="w-full gap-2"
							size="lg"
						>
							<Link
								href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_BOT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_DASHBOARD_URL}/api/auth/callback&response_type=code&scope=identify%20email`}
							>
								Login with Discord
								<Icon.SolidDiscord className="h-5 w-5" />
							</Link>
						</Button>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
