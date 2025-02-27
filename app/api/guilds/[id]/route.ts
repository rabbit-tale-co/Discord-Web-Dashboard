import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { Channel, Guild, Role } from "discord.js";

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

		const roles = guildData.guild_details.roles;
		const filteredRoles = roles.filter((role: Role) => {
			// Skip @everyone role
			if (role.name === "@everyone") return false;

			// Skip Discord-managed roles (including bot roles)
			if (role.managed) return false;

			return true;
		});

		// Sort channels by position
		const channels = guildData.guild_details.channels || [];
		const sortedChannels = Array.isArray(channels)
			? [...channels].sort((a, b) => {
					// First sort by category
					if (a.parent_id !== b.parent_id) {
						// If one has a parent and the other doesn't, put the one without parent first
						if (!a.parent_id) return -1;
						if (!b.parent_id) return 1;

						// Find the categories and compare their positions
						const categoryA = channels.find(
							(c: Channel) => c.id === a.parent_id,
						);
						const categoryB = channels.find(
							(c: Channel) => c.id === b.parent_id,
						);

						if (categoryA && categoryB) {
							return categoryA.position - categoryB.position;
						}
					}

					// Then sort by position within the same category
					return a.position - b.position;
				})
			: [];

		// Make sure we have a valid array for filtered guild data
		const guildDataFiltered = {
			...guildData,
			guild_details: {
				...guildData.guild_details,
				channels: sortedChannels,
				roles: filteredRoles || [],
			},
		};

		const members = guildData.guild_details.members;
		const emojis = guildData.guild_details.emojis;
		const stickers = guildData.guild_details.stickers;
		const bans = guildData.guild_details.bans;

		const timestamp =
			Number(BigInt(guildDataFiltered.guild_details.id) >> BigInt(22)) +
			1420070400000;
		const created_at = new Date(timestamp).toISOString();

		// console.log(created_at);
		// Add the creation date to the guild data
		const enrichedGuildData = {
			...guildDataFiltered,
			created_at,
		};

		return NextResponse.json(enrichedGuildData);
	} catch (error) {
		console.error("Error in guild details route:", error);
		return NextResponse.json(null);
	}
}
