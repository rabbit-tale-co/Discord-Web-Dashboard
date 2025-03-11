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

		const apiUrl = `https://discord.com/api/users/${id}`;
		console.log("Calling Discord API:", apiUrl);

		const response = await fetch(apiUrl, {
			headers: {
				Authorization: `Bot ${process.env.BOT_TOKEN}`,
				"Content-Type": "application/json",
			},
			cache: "no-store",
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Discord API Error Details:", {
				status: response.status,
				statusText: response.statusText,
				error: errorText,
				headers: Object.fromEntries(response.headers.entries()),
				url: apiUrl,
			});
			throw new Error(
				`Failed to fetch user: ${response.status} - ${errorText}`,
			);
		}

		const memberData = await response.json();
		console.log("Full Discord member data:", memberData);

		return NextResponse.json(memberData);
	} catch (error) {
		console.error("Error fetching user:", error);
		return NextResponse.json(
			{ error: "Failed to fetch user" },
			{ status: 500 },
		);
	}
}
