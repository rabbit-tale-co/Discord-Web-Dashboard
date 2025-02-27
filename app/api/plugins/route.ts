import { NextResponse } from "next/server";

export async function GET(request: Request) {
	try {
		if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
			throw new Error("Backend URL not configured");
		}

		// Get bot_id and guild_id from query params
		const { searchParams } = new URL(request.url);
		const bot_id = searchParams.get("bot_id");
		const guild_id = searchParams.get("guild_id");

		if (!bot_id || !guild_id) {
			return NextResponse.json(
				{ error: "Missing bot_id or guild_id" },
				{ status: 400 },
			);
		}

		const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/plugins/get`;
		console.log("Fetching plugins from:", url);

		const response = await fetch(url, {
			method: "POST", // Changed to POST as backend expects
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({ bot_id, guild_id }), // Send required params
			cache: "no-cache",
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Plugin API Error:", {
				status: response.status,
				statusText: response.statusText,
				body: errorText,
			});
			throw new Error(`API returned ${response.status}: ${errorText}`);
		}

		const data = await response.json();
		// console.log("Plugins fetched successfully:", data);
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error in plugins route:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch plugins",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
