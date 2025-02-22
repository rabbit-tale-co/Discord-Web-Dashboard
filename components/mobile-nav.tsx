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
import type { NavItem } from "@/types";
import type { UserSession } from "@/app/authContext";
import { useAuth } from "@/app/authContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const navigationItems: NavItem[] = [
	{
		name: "Features",
		path: "/features",
		icon: Icon.SolidLogo,
		features: [
			{
				title: "Analytics Dashboard",
				description: "Track your server's growth and engagement",
				path: "/features/analytics",
				// image: "/images/analytics.jpg",
			},
			{
				title: "Server Insights",
				description: "Get detailed insights about your community",
				path: "/features/insights",
				// image: "/images/insights.jpg",
			},
			{
				title: "Integration Hub",
				description: "Connect with your favorite services",
				path: "/features/integrations",
				image: "/images/integrations.jpg",
			},
			{
				title: "Moderation Tools",
				description: "Advanced moderation tools to keep your server safe",
				icon: Icon.SolidLogo,
				path: "/features/moderation",
			},
			{
				title: "Custom Commands",
				description: "Create and manage custom commands",
				icon: Icon.SolidLogo,
				path: "/features/commands",
			},
			{
				title: "Auto Roles",
				description: "Automatically assign roles to new members",
				icon: Icon.SolidLogo,
				path: "/features/roles",
			},
			{
				title: "Welcome Messages",
				description: "Customize how you greet new members",
				icon: Icon.SolidLogo,
				path: "/features/welcome",
			},
		],
	},
	{
		name: "Solutions",
		path: "/solutions",
		icon: Icon.SolidLogo,
		features: [
			{
				title: "For Gaming Communities",
				description: "Enhance your gaming server experience",
				path: "/solutions/gaming",
				image: "/images/gaming.jpg",
			},
			{
				title: "For Business",
				description: "Professional tools for business servers",
				path: "/solutions/business",
				image: "/images/business.jpg",
			},
		],
	},
	{
		name: "Plugins",
		path: "/plugins",
		icon: Icon.SolidLogo,
		features: [
			{
				title: "Music Player",
				description: "High quality music streaming for your server",
			},
			{
				title: "Leveling System",
				description: "Engage members with XP and levels",
			},
		],
	},
	{
		name: "Documentation",
		path: "/docs",
		icon: Icon.SolidLogo,
		features: [
			{
				title: "Getting Started",
				description: "Learn how to set up and configure your bot",
				icon: Icon.SolidLogo,
				path: "/docs/getting-started",
			},
			{
				title: "API Reference",
				description: "Detailed documentation of all available commands",
				icon: Icon.SolidLogo,
				path: "/docs/api-reference",
			},
		],
	},
];

export function MobileNav({ user }: { user?: UserSession }) {
	const [open, setOpen] = React.useState(false);
	const [openItems, setOpenItems] = React.useState<string[]>([]);
	const { logout } = useAuth();

	// const router = useRouter();

	const isGif = user?.avatar?.startsWith("a_");
	const avatarUrl = isGif
		? `https://cdn.discordapp.com/avatars/${user?.id}/${user?.avatar}.gif`
		: `https://cdn.discordapp.com/avatars/${user?.id}/${user?.avatar}.webp`;

	const toggleItem = (itemName: string) => {
		setOpenItems((prev) =>
			prev.includes(itemName)
				? prev.filter((item) => item !== itemName)
				: [...prev, itemName],
		);
	};

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" className="lg:hidden">
					<Icon.OutlineMenu size={20} />
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-[300px] p-0 flex flex-col">
				<SheetTitle className="border-b flex p-4">
					<Button variant="ghost" className="w-full justify-start gap-2">
						<Icon.SolidLogo size={40} />
						<div className="flex flex-col items-start gap-0.5">
							<span className="font-semibold">
								{process.env.NEXT_PUBLIC_BOT_NAME}
							</span>
							<span className="text-xs text-muted-foreground">
								{user?.verified ? "Nitro" : "Free"}
								{/* TODO: add user.hasPremium */}
							</span>
						</div>
					</Button>
				</SheetTitle>

				{/* Content */}
				<div className="flex-1 overflow-auto">
					<div className="space-y-1 p-2">
						{navigationItems.map((item) => (
							<div key={item.name}>
								{item.features ? (
									<React.Fragment key={item.name}>
										<Button
											variant={"ghost"}
											className="w-full justify-start gap-2 rounded-lg"
											onClick={() => toggleItem(item.name)}
										>
											{item.icon && <item.icon size={22} />}
											{item.name}
											<Icon.OutlineArrowRight
												className={cn(
													"ml-auto size-4 transition-transform",
													openItems.includes(item.name) && "rotate-90",
												)}
											/>
										</Button>
										{openItems.includes(item.name) && (
											<div className="relative ml-5.5 pl-1.5 before:absolute before:left-0 mt-1 before:-top-1 before:h-[calc(100%+8px)] before:w-px before:bg-border">
												{item.features.map((subItem) => (
													<div
														key={subItem.title}
														className="relative flex items-center" // TODO: add a curved line to the left of the button
													>
														{/* <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
															<svg
																width="15"
																height="10"
																viewBox="0 0 15 10"
																className="text-border"
																aria-label="Curved line"
																role="img"
															>
																<path
																	d="M0,0 C1,10,7.5,10,15,10"
																	stroke="currentColor"
																	fill="none"
																	strokeWidth="1"
																/>
															</svg>
														</div> */}
														<Button
															key={subItem.title}
															variant={"ghost"}
															className="w-full justify-start rounded-lg"
															asChild
														>
															<Link href={subItem.path || "#"}>
																{subItem.icon && <subItem.icon size={22} />}
																{subItem.title}
															</Link>
														</Button>
													</div>
												))}
											</div>
										)}
									</React.Fragment>
								) : (
									<Button
										variant="ghost"
										className="w-full justify-start gap-2"
										asChild
									>
										<Link href={item.path}>
											{item.icon && <item.icon size={20} />}
											{item.name}
										</Link>
									</Button>
								)}
							</div>
						))}
					</div>
				</div>

				{/* Footer */}
				{user ? (
					<div className="border-t">
						<div className="p-4 flex gap-2 items-center justify-between">
							<div className="flex size-8 items-center justify-center rounded-full border">
								{user.avatar ? (
									<Avatar className="size-8 rounded-full">
										<AvatarImage src={avatarUrl} alt={user.username} />
										<AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
									</Avatar>
								) : (
									<User className="size-4" />
								)}
							</div>
							<div className="flex flex-col items-start gap-0.5">
								<span className="font-medium">{user.global_name}</span>
								<span className="text-xs text-muted-foreground">
									{user.email}
								</span>
							</div>
							<Button variant="ghost" size="iconLg" onClick={() => logout()}>
								<Icon.OutlineArrowRight className="size-4" />
							</Button>
						</div>
					</div>
				) : (
					<div className="border-t">
						<div className="p-4">
							<Button variant="discord" className="w-full justify-start gap-2">
								Login
								<Icon.SolidDiscord />
							</Button>
						</div>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
