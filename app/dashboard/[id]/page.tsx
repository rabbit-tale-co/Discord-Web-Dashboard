"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useGuild } from "@/hooks/use-guilds";
import { ServerOverview } from "@/components/dashbaord/server-overview";
import { Button } from "@/components/ui/button";
import { CalendarDateRangePicker } from "@/components/dashbaord/date-range-picker";
import * as Icon from "@/components/icons";
import { useSidebar } from "@/components/navigation/sidebar";

export default function Dashboard() {
	const params = useParams();
	const { guildData, status, error } = useGuild(params.id as string);
	const { toggleSidebar } = useSidebar();

	return (
		<main className="container mx-auto py-3 px-4 sm:px-6 sm:py-6">
			<div className="mt-3 sm:mt-6 space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
							Dashboard
						</h2>
					</div>
					<div className="hidden sm:flex items-center space-x-2">
						<CalendarDateRangePicker />
						<Button disabled size={"lg"}>
							Download Report
						</Button>
					</div>
					<Button
						variant={"secondary"}
						size={"iconLg"}
						onClick={toggleSidebar}
						className="max-md:block hidden"
					>
						<Icon.OutlineMenu size={22} />
					</Button>
				</div>
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
	);
}
