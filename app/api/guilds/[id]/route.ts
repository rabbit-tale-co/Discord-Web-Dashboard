import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { Guild } from "discord.js";

export async function GET(request: Request) {
	try {
		const id = decodeURIComponent(
			request.url.split("/").pop()?.split("?")[0] || "",
		);

		const cookieStore = await cookies();
		const accessToken = cookieStore.get("access_token");

		if (!accessToken?.value) {
			return NextResponse.json(
				{ error: "No access token found" },
				{ status: 401 },
			);
		}

		const url = new URL(
			`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/guild/details`,
		);
		url.searchParams.append("guildId", id);

		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${accessToken.value}`,
				"Content-Type": "application/json",
			},
			cache: "no-store",
		});

		if (!response.ok) {
			return NextResponse.json(null);
		}

		const guildData = await response.json();
		const timestamp =
			Number(BigInt(guildData.guild_details.id) >> BigInt(22)) + 1420070400000;
		const created_at = new Date(timestamp).toISOString();

		// console.log(created_at);
		// Add the creation date to the guild data
		const enrichedGuildData = {
			...guildData,
			created_at,
		};

		return NextResponse.json(enrichedGuildData);
	} catch (error) {
		console.error("Error in guild details route:", error);
		return NextResponse.json(null);
	}
}
