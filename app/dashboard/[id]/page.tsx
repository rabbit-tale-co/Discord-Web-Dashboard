"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useGuild } from "@/hooks/use-guilds";
import { ServerOverview } from "@/components/dashbaord/server-overview";
import { Button } from "@/components/ui/button";
import { CalendarDateRangePicker } from "@/components/dashbaord/date-range-picker";
import * as Icon from "@/components/icons";
import { useSidebar } from "@/components/navigation/sidebar";
import { useAuth } from "@/context/authContext";
import { DropDownUser } from "@/components/drop-down-user";

export default function Dashboard() {
	const { user } = useAuth();
	const params = useParams();
	const { guildData, status, error } = useGuild(params.id as string);
	const { toggleSidebar } = useSidebar();

	return (
		<div className="relative min-h-screen">
			<header className="sticky top-6 z-50">
				<div className="container mx-auto py-3 px-4 sm:px-6">
					<div className="flex justify-end">
						<div className="hidden sm:flex items-center space-x-2 p-2 rounded-full bg-primary/10 backdrop-blur supports-[backdrop-filter]:bg-primary/10">
							<Button
								variant={"secondary"}
								size={"iconLg"}
								onClick={toggleSidebar}
							>
								<Icon.OutlineMenu size={22} />
							</Button>
							<CalendarDateRangePicker iconOnly />
							<Button disabled size={"lg"}>
								Download Report
							</Button>
							{user && (
								<DropDownUser
									username={user.username}
									email={user.email}
									avatar={user.avatar || ""}
									id={user.id}
									type="dropdown"
								/>
							)}
						</div>
						<Button
							variant={"secondary"}
							size={"iconLg"}
							onClick={toggleSidebar}
							className="sm:hidden"
						>
							<Icon.OutlineMenu size={22} />
						</Button>
					</div>
				</div>
			</header>
			<main className="container mx-auto py-3 px-4 sm:px-6 h-[2000px]">
				<div className="mt-3 sm:mt-6 space-y-4">
					{status === "loading" ? (
						<div className="text-center p-4">Loading...</div>
					) : error ? (
						<div className="text-center text-red-500 p-4">Error: {error}</div>
					) : guildData ? (
						<ServerOverview guildData={guildData} />
					) : (
						<div className="text-center p-4">No server data found</div>
					)}
				</div>
			</main>
		</div>
	);
}
