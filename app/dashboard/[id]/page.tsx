"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useGuild } from "@/hooks/use-guilds";
import { ServerOverview } from "@/components/dashbaord/server-overview";

export default function Dashboard() {
	const params = useParams();
	const { guildData, status, error } = useGuild(params.id as string);

	if (status === "loading") {
		return <div>Loading...</div>;
	}

	if (error) {
		return <div>Error: {error}</div>;
	}

	if (!guildData) {
		return <div>No server data found</div>;
	}

	return (
		<main className="container mx-auto py-6">
			<div className="mt-6">
				<ServerOverview guildData={guildData} />
			</div>
		</main>
	);
}
