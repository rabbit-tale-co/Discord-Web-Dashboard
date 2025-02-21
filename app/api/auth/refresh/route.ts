import { NextResponse } from "next/server";

export async function POST(req: Request) {
	try {
		const { refresh_token } = await req.json();

		const params = new URLSearchParams();
		params.append("client_id", process.env.NEXT_PUBLIC_BOT_ID || "");
		params.append("client_secret", process.env.BOT_CLIENT_SECRET || "");
		params.append("grant_type", "refresh_token");
		params.append("refresh_token", refresh_token);

		const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: params.toString(),
		});

		const data = await tokenResponse.json();

		return NextResponse.json({
			access_token: data.access_token,
			refresh_token: data.refresh_token,
			expires_in: data.expires_in,
		});
	} catch (error) {
		console.error("Refresh failed:", error);
		return NextResponse.json(
			{ error: "Failed to refresh token" },
			{ status: 500 },
		);
	}
}
