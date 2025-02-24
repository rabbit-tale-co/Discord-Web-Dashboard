"use client";

import React from "react";
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
} from "@/components/ui/sidebar";
import type { NavSection } from "@/types/navigation";
import * as Icon from "@/components/icons";
import { Badge } from "@/components/ui/badge";

// Resolve icon on client side
const resolveIcon = (iconName: string) => {
	const IconComponent = Icon[iconName as keyof typeof Icon];
	return IconComponent;
};

export function NavMain({ section }: { section: NavSection }) {
	if (!section) return null;

	const SectionIcon = section.iconName ? resolveIcon(section.iconName) : null;

	return (
		<SidebarGroup>
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
									{/* {SectionIcon && <SectionIcon size={22} />} */}
									{section.title}
								</div>
							</SidebarGroupLabel>
						</CollapsibleTrigger>
						<CollapsibleContent className="ml-2.5">
							<SidebarMenuSub>
								{section.categories.map((category) => (
									<Collapsible
										key={category.title}
										className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
									>
										<CollapsibleTrigger asChild className="relative">
											<SidebarMenuButton>
												<ChevronRight className="transition-transform duration-150" />
												{/* {category.iconName && (
													<React.Fragment>
														{(() => {
															const ItemIcon = resolveIcon(category.iconName);
															return <ItemIcon size={22} />;
														})()}
													</React.Fragment>
												)} */}
												{category.title}
												<Badge
													variant={"outline"}
													className="absolute right-1 top-1/2 -translate-y-1/2"
												>
													<span className="text-xs text-muted-foreground">
														{/* TODO: Active/Inactive number */}
														{(() => {
															// TODO: Get active/inactive number from database
															const active = category.items.filter(
																(item) => item.status === "active",
															).length;
															return `${active}/${category.items.length}`;
														})()}
													</span>
												</Badge>
											</SidebarMenuButton>
										</CollapsibleTrigger>
										<CollapsibleContent className="ml-2.5">
											<SidebarMenuSub>
												{category.items.map((item) => (
													<SidebarMenuItem key={item.title}>
														<SidebarMenuButton asChild>
															<Link href={item.url}>
																{/* {item.iconName &&
																	(() => {
																		const ItemIcon = resolveIcon(item.iconName);
																		return <ItemIcon size={22} />;
																	})()} */}
																{item.title}
															</Link>
														</SidebarMenuButton>
														<span className="absolute -right-4 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-muted-foreground/50" />
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
