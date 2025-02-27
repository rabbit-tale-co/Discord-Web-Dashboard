import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
	try {
		const cookieStore = await cookies();
		const authToken = cookieStore.get("access_token")?.value;

		if (!authToken) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		// Pobierz guild_id z query params
		const { searchParams } = new URL(request.url);
		const guildId = searchParams.get("guild_id");

		if (!guildId) {
			return new NextResponse("Missing guild_id parameter", { status: 400 });
		}

		// Pobierz kanały z API Discorda
		const response = await fetch(
			`https://discord.com/api/guilds/${guildId}/channels`,
			{
				headers: {
					Authorization: `Bot ${process.env.BOT_TOKEN}`,
				},
			},
		);

		if (!response.ok) {
			console.error("Discord API error:", await response.text());
			throw new Error("Failed to fetch channels from Discord API");
		}

		//TODO: 

		const channels = await response.json();
		return NextResponse.json(channels);
	} catch (error) {
		console.error("Error fetching channels:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
