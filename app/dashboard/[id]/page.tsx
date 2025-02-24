"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useGuild } from "@/hooks/use-guilds";
import { ServerOverview } from "@/components/dashbaord/server-overview";
import { Button } from "@/components/ui/button";
import { CalendarDateRangePicker } from "@/components/dashbaord/date-range-picker";

export default function Dashboard() {
	const params = useParams();
	const { guildData, status, error } = useGuild(params.id as string);

	return (
		<main className="container mx-auto py-6">
			<div className="mt-6 space-y-4">
				<div className="flex items-center justify-between space-y-2">
					<h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
					<div className="flex items-center space-x-2">
						<CalendarDateRangePicker />
						<Button disabled size={"lg"}>
							Download Report
						</Button>
					</div>
				</div>
				{status === "loading" ? (
					<div>Loading...</div>
				) : error ? (
					<div>Error: {error}</div>
				) : guildData ? (
					<ServerOverview guildData={guildData} />
				) : (
					<div>No server data found</div>
				)}
			</div>
		</main>
	);
}
