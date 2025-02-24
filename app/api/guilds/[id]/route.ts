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

		const guildData = (await response.json()) as Guild;

		// console.log(guildData);

		return NextResponse.json(guildData);
	} catch (error) {
		console.error("Error in guild details route:", error);
		// Return a default structure even in case of error
		return NextResponse.json(null);
	}
}
