"use client";

import React, { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuBadge,
} from "@/components/navigation/sidebar";
import type { NavSection } from "@/types/navigation";
import * as Icon from "@/components/icons";
import { navigationConfig } from "../navigation/config";
import { useServerPlugins } from "@/context/plugins-context";
import { Badge } from "../ui/badge";

// Resolve icon on client side
const resolveIcon = (iconName: string) => {
	const IconComponent = Icon[iconName as keyof typeof Icon];
	return IconComponent;
};

export function NavMain({
	section,
	guildId,
}: {
	section: NavSection;
	guildId: string;
}) {
	const { pluginsData } = useServerPlugins();

	const enabledPlugins = useMemo(() => {
		return pluginsData.filter((plugin) => plugin.enabled);
	}, [pluginsData]);

	if (!section) return null;

	//const SectionIcon = section.iconName ? resolveIcon(section.iconName) : null;

	return (
		<SidebarGroup key={`plugins-${guildId}`}>
			{/* HOME */}
			<SidebarMenu>
				<Collapsible
					asChild
					defaultOpen
					className="group/collapsible [&[data-state=open]>div>svg:first-child]:rotate-90"
				>
					<SidebarMenuItem>
						<CollapsibleTrigger asChild>
							<SidebarGroupLabel asChild className="cursor-pointer">
								<div className="flex items-center gap-2">
									<ChevronRight className="transition-transform duration-150" />
									Home
								</div>
							</SidebarGroupLabel>
						</CollapsibleTrigger>
						<CollapsibleContent className="ml-2.5">
							<SidebarMenuSub>
								<SidebarMenuItem>
									<SidebarMenuButton asChild>
										<Link href={`/dashboard/${guildId}`}>Dashboard</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenuSub>
						</CollapsibleContent>
					</SidebarMenuItem>
				</Collapsible>
			</SidebarMenu>

			{/* PLUGINS */}
			<SidebarMenu>
				<Collapsible
					asChild
					defaultOpen
					className="group/collapsible [&[data-state=open]>div>svg:first-child]:rotate-90"
				>
					<SidebarMenuItem>
						<CollapsibleTrigger asChild>
							<SidebarGroupLabel asChild className="cursor-pointer">
								<div className="flex items-center gap-2">
									<ChevronRight className="transition-transform duration-150" />
									{section.title}
									{/* check if menu is open */}
									{section.title === "Plugins" && (
										<Badge variant={"outline"} className="ml-auto">
											{enabledPlugins.length} /{" "}
											{section.categories.reduce(
												(acc, category) => acc + category.items.length,
												0,
											)}
										</Badge>
									)}
								</div>
							</SidebarGroupLabel>
						</CollapsibleTrigger>
						<CollapsibleContent className="ml-2.5">
							<SidebarMenuSub>
								{section.categories.map((category) => (
									<Collapsible key={category.title}>
										<CollapsibleTrigger asChild className="relative">
											<SidebarMenuButton>
												<ChevronRight className="transition-transform duration-150" />
												{category.title}
												<Badge variant={"outline"} className="ml-auto">
													{
														category.items.filter((item) =>
															enabledPlugins.some((p) => p.id === item.url),
														).length
													}{" "}
													/ {category.items.length}
												</Badge>
											</SidebarMenuButton>
										</CollapsibleTrigger>
										<CollapsibleContent className="ml-2.5">
											<SidebarMenuSub>
												{category.items.map((item) => (
													<SidebarMenuItem key={item.title}>
														<SidebarMenuButton asChild>
															<Link
																href={`/dashboard/${guildId}/plugin/${item.url}`}
															>
																{item.title}
																<span
																	className={`absolute -right-5 size-1.5 rounded-full ${
																		enabledPlugins.some(
																			(p) => p.id === item.url,
																		)
																			? "bg-green-500"
																			: "bg-red-500"
																	}`}
																/>
															</Link>
														</SidebarMenuButton>
													</SidebarMenuItem>
												))}
											</SidebarMenuSub>
										</CollapsibleContent>
									</Collapsible>
								))}
							</SidebarMenuSub>
						</CollapsibleContent>
					</SidebarMenuItem>
				</Collapsible>
			</SidebarMenu>
		</SidebarGroup>
	);
}

export function NavMainMobile() {
	return (
		<SidebarGroup>
			<SidebarMenu>
				{navigationConfig.map((section) => (
					<Collapsible
						key={section.title}
						className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
					>
						<CollapsibleTrigger asChild>
							<SidebarMenuButton className="w-full">
								<ChevronRight className="transition-transform duration-150" />
								{section.title}
							</SidebarMenuButton>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<SidebarMenuSub>
								{section.categories.map((category) => (
									<React.Fragment key={category.title}>
										{category.items.map((item) => (
											<SidebarMenuItem key={item.title}>
												<SidebarMenuButton asChild>
													<Link href={`plugin/${item.url}` || ""}>
														<span className="flex flex-col">
															<span>{item.title}</span>
														</span>
													</Link>
												</SidebarMenuButton>
											</SidebarMenuItem>
										))}
									</React.Fragment>
								))}
							</SidebarMenuSub>
						</CollapsibleContent>
					</Collapsible>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
