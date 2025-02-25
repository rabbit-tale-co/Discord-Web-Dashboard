import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
	try {
		const cookieStore = await cookies();
		const accessToken = cookieStore.get("access_token")?.value;
		const refreshToken = cookieStore.get("refresh_token")?.value;
		const user = cookieStore.get("user")?.value;

		if (!accessToken || !refreshToken) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// First try with current access token
		let userResponse = await fetch("https://discord.com/api/users/@me", {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		// If token expired, refresh and try again
		if (userResponse.status === 401) {
			const newTokens = await fetch(
				`${process.env.NEXT_PUBLIC_DASHBOARD_URL}/api/auth/refresh`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ refresh_token: refreshToken }),
				},
			).then((res) => res.json());

			userResponse = await fetch("https://discord.com/api/users/@me", {
				headers: { Authorization: `Bearer ${newTokens.access_token}` },
			});
		}

		if (!userResponse.ok) {
			return NextResponse.json(
				{ error: "Failed to fetch user" },
				{ status: 401 },
			);
		}

		const userData = await userResponse.json();

		return NextResponse.json(userData);
	} catch (error) {
		console.error("Auth API Error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
