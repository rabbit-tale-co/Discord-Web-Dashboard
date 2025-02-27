"use client";

import * as React from "react";
import { ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import {
	DropdownMenu,
	DropdownMenuContent,
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
import * as Icon from "@/components/icons";
import Image from "next/image";
import { useParams } from "next/navigation";
import avatarUrl from "@/lib/is-gif";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface Server {
	id: string;
	name: string;
	icon: string | null;
	features: string[];
	approximate_member_count?: number;
	premium_tier: number;
	has_bot: boolean;
}

export function ServerSwitcher({
	servers = [],
}: {
	servers: Server[];
}) {
	const { isMobile } = useSidebar();
	const params = useParams();
	const [activeServer, setActiveServer] = React.useState<Server | null>(null);
	const [isOpen, setIsOpen] = React.useState(false);
	const isMounted = React.useRef(true);

	React.useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
		};
	}, []);

	React.useEffect(() => {
		if (!isMounted.current) return;

		if (servers.length > 0) {
			// Find server matching current URL param or default to first server
			const currentServer =
				servers.find((server) => server.id === params.id) || servers[0];
			setActiveServer(currentServer);
		}
	}, [servers, params.id]);

	if (!activeServer) {
		return null;
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
								<AvatarImage
									src={avatarUrl(
										activeServer.id,
										activeServer.icon || "",
										64,
										false,
									)}
									alt={activeServer.name}
									className="h-full w-full object-cover"
								/>
								<AvatarFallback>
									{activeServer.name.substring(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">
									{activeServer.name}
								</span>
								<span className="truncate text-xs">
									{activeServer.approximate_member_count?.toLocaleString()}{" "}
									members
								</span>
							</div>
							<ChevronsUpDown className="ml-auto" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
						forceMount
					>
						<DropdownMenuLabel className="text-xs text-muted-foreground">
							Your Servers
						</DropdownMenuLabel>
						{servers.map((server, index) => (
							<DropdownMenuItem key={server.id} asChild className="gap-2 p-2">
								<Link
									href={`/dashboard/${server.id}`}
									onClick={() => {
										setIsOpen(false);
									}}
								>
									<div className="flex size-6 items-center justify-center rounded-sm overflow-hidden">
										<Image
											src={avatarUrl(server.id, server.icon || "", 64, false)}
											alt={server.name}
											width={24}
											height={24}
											className="h-full w-full object-cover"
										/>
									</div>
									<span className="flex-1">{server.name}</span>
									{server.premium_tier > 0 && (
										<Icon.OutlineCrown className="size-4 text-amber-400" />
									)}
								</Link>
							</DropdownMenuItem>
						))}
						{/* <DropdownMenuSeparator />
						<DropdownMenuItem asChild className="gap-2 p-2">
							<Link href="/servers">
								<div className="flex size-6 items-center justify-center rounded-md border bg-background">
									<Plus className="size-4" />
								</div>
								<span className="font-medium text-muted-foreground">
									Add server
								</span>
							</Link>
						</DropdownMenuItem> */}
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
