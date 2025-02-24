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
	SidebarMenuBadge,
} from "@/components/navigation/sidebar";
import type { NavSection } from "@/types/navigation";
import * as Icon from "@/components/icons";
import { navigationConfig } from "../navigation/config";

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
												<SidebarMenuBadge className="absolute right-1 top-1/2 -translate-y-1/2">
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
												</SidebarMenuBadge>
											</SidebarMenuButton>
										</CollapsibleTrigger>
										<CollapsibleContent className="ml-2.5">
											<SidebarMenuSub>
												{category.items.map((item) => (
													<SidebarMenuItem key={item.title}>
														<SidebarMenuButton asChild>
															<Link href={item.url || ""}>
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
                {section.iconName && (
                  <React.Fragment>
                    {(() => {
                      const SectionIcon = resolveIcon(section.iconName);
                      return SectionIcon && <SectionIcon size={22} />;
                    })()}
                  </React.Fragment>
                )}
                {section.title}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {section.categories.map((category) => (
                  <React.Fragment key={category.title}>
                    {/* Only show items, skip category headers */}
                    {category.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <Link href={item.url || ""}>
                            {item.iconName && (
                              <React.Fragment>
                                {(() => {
                                  const ItemIcon = resolveIcon(item.iconName);
                                  return ItemIcon && <ItemIcon size={18} />;
                                })()}
                              </React.Fragment>
                            )}
                            <span className="flex flex-col">
                              <span>{item.title}</span>
                              {item.description && (
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                  {item.description}
                                </span>
                              )}
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
