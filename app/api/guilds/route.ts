import { NextResponse } from "next/server";
import { cookies } from "next/headers";

interface DiscordGuild {
	id: string;
	name: string;
	icon: string | null;
	features: string[];
	approximate_member_count?: number;
	member_count?: number;
	premium_tier: number;
	invite_link?: string;
	owner: boolean;
	permissions: string;
}

export async function GET() {
	try {
		const cookieStore = await cookies();
		const accessToken = cookieStore.get("access_token");

		if (!accessToken?.value) {
			return NextResponse.json(
				{ error: "No access token found" },
				{ status: 401 },
			);
		}

		// First, fetch user's guilds directly from Discord API
		const userGuildsResponse = await fetch(
			"https://discord.com/api/v10/users/@me/guilds",
			{
				headers: {
					Authorization: `Bearer ${accessToken.value}`,
				},
			},
		);

		if (!userGuildsResponse.ok) {
			console.error("Discord API Error:", {
				status: userGuildsResponse.status,
				statusText: userGuildsResponse.statusText,
			});
			throw new Error(
				`Failed to fetch user guilds: ${userGuildsResponse.status}`,
			);
		}

		const userGuilds = await userGuildsResponse.json();

		// Then fetch bot's guilds
		const botGuildsResponse = await fetch(
			`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/guild/all`,
			{
				headers: {
					Authorization: `Bearer ${accessToken.value}`,
				},
			},
		);

		if (!botGuildsResponse.ok) {
			throw new Error(
				`Failed to fetch bot guilds: ${botGuildsResponse.status}`,
			);
		}

		const botGuilds = await botGuildsResponse.json();
		const botGuildsArray = Array.isArray(botGuilds)
			? botGuilds
			: botGuilds.guilds || [];

		// Create a Set of guild IDs where the bot is present
		const botGuildIds = new Set(
			botGuildsArray.map((guild: DiscordGuild) => guild.id),
		);

		// Filter for guilds where user has ADMINISTRATOR permission (owner or admin)
		const ADMINISTRATOR = 0x8;
		const userAdminGuilds = userGuilds.filter((guild: DiscordGuild) => {
			const permissions = BigInt(guild.permissions);
			return (permissions & BigInt(ADMINISTRATOR)) === BigInt(ADMINISTRATOR);
		});

		// Map the guilds with combined data
		const mappedGuilds = userAdminGuilds.map((guild: DiscordGuild) => {
			const botGuild = botGuildsArray.find(
				(bg: DiscordGuild) => bg.id === guild.id,
			);
			return {
				id: guild.id,
				name: guild.name,
				icon: guild.icon,
				features: guild.features || [],
				approximate_member_count: botGuild?.approximate_member_count || 0,
				premium_tier: botGuild?.premium_tier || 0,
				has_bot: Boolean(botGuild),
			};
		});

		// console.log("Filtered guilds:", mappedGuilds);
		return NextResponse.json(mappedGuilds);
	} catch (error) {
		console.error("Error fetching guilds:", error);
		return NextResponse.json(
			{ error: "Failed to fetch guilds" },
			{ status: 500 },
		);
	}
}
