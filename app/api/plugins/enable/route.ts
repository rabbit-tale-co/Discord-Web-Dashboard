import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		console.log("POST /api/plugins/enable - Request received");

		if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
			console.error("Backend URL not configured");
			return NextResponse.json(
				{ error: "Backend URL not configured" },
				{ status: 500 },
			);
		}

		// Get request body
		const body = await request.json();

		// Extract parameters from the frontend - support both formats for backward compatibility
		const {
			pluginId,
			guildId, // Old format
			plugin_name,
			guild_id,
			bot_id: requestBotId, // New format
		} = body;

		// Use the new format if provided, fall back to old format
		const effectiveGuildId = guild_id || guildId;
		const effectivePluginName = plugin_name || pluginId;
		const effectiveBotId = requestBotId || process.env.NEXT_PUBLIC_BOT_ID;

		console.log("Request parameters:", {
			guild_id: effectiveGuildId,
			plugin_name: effectivePluginName,
			bot_id: effectiveBotId ? "[PROVIDED]" : "[MISSING]",
		});

		// Validate required fields
		if (!effectiveGuildId || !effectivePluginName) {
			console.error("Missing required fields");
			return NextResponse.json(
				{ error: "Missing required fields: guild_id or plugin_name" },
				{ status: 400 },
			);
		}

		// Get bot ID from environment variables if not provided in request
		if (!effectiveBotId) {
			console.error("Bot ID not configured");
			return NextResponse.json(
				{ error: "Bot ID not configured" },
				{ status: 500 },
			);
		}

		// Call the backend API directly
		const endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/plugins/enable`;

		console.log(`Calling backend API: ${endpoint}`);

		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				bot_id: effectiveBotId,
				guild_id: effectiveGuildId,
				plugin_name: effectivePluginName,
			}),
		});

		// For debugging
		console.log(`Backend response status: ${response.status}`);

		// Handle the response
		if (!response.ok) {
			const errorText = await response.text();
			console.error("Backend API error:", errorText);

			return NextResponse.json(
				{
					error: "Failed to enable plugin",
					details: errorText,
				},
				{ status: response.status },
			);
		}

		// Forward the response from the backend
		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error enabling plugin:", error);
		return NextResponse.json(
			{
				error: "Failed to enable plugin",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
