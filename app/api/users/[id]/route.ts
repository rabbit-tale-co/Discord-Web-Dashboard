import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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

		const response = await fetch(`https://discord.com/api/users/${id}`, {
			headers: {
				Authorization: `Bot ${process.env.BOT_TOKEN}`,
			},
			cache: "no-store",
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch user: ${response.status}`);
		}

		const userData = await response.json();

		return NextResponse.json({
			id: userData.id,
			username: userData.username,
			avatar: userData.avatar,
			displayName: userData.global_name,
		});
	} catch (error) {
		console.error("Error fetching user:", error);
		return NextResponse.json(
			{ error: "Failed to fetch user" },
			{ status: 500 },
		);
	}
}
