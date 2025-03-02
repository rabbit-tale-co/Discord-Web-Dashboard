import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		console.log("POST /api/plugins/disable - Request received");

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

		// First try the direct endpoint
		const directEndpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/plugins/disable`;
		// console.log(`Calling direct API endpoint: ${directEndpoint}`);

		try {
			const directResponse = await fetch(directEndpoint, {
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

			console.log(`Direct endpoint response status: ${directResponse.status}`);

			// If the direct endpoint was successful, return the response
			if (directResponse.ok) {
				const data = await directResponse.json();
				return NextResponse.json(data);
			}

			// If we get here, the direct endpoint failed
			// Only log the error but don't return yet, we'll try the fallback method
			const errorText = await directResponse.text();
			console.error("Direct API error:", errorText);

			// If it's not a 500 error, we should return the error directly
			// as it's likely a client error (400s)
			if (directResponse.status < 500) {
				return NextResponse.json(
					{
						error: "Failed to disable plugin",
						details: errorText,
					},
					{ status: directResponse.status },
				);
			}

			// For 500 errors, we'll try the fallback method
			console.log(
				"Direct endpoint returned 500, trying config endpoint as fallback",
			);
		} catch (directError) {
			// If there was a network error or something else, log it and continue to fallback
			console.error("Error with direct endpoint:", directError);
			console.log("Trying config endpoint as fallback due to error");
		}

		// Fallback to using the config endpoint
		const configEndpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/plugins/config`;
		console.log(`Calling fallback config endpoint: ${configEndpoint}`);

		const configResponse = await fetch(configEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				bot_id: effectiveBotId,
				guild_id: effectiveGuildId,
				plugin_name: effectivePluginName,
				config: { enabled: false },
			}),
		});

		console.log(
			`Fallback config endpoint response status: ${configResponse.status}`,
		);

		// Handle the response from the fallback endpoint
		if (!configResponse.ok) {
			const errorText = await configResponse.text();
			console.error("Fallback config API error:", errorText);

			return NextResponse.json(
				{
					error:
						"Failed to disable plugin (both direct and fallback methods failed)",
					details: errorText,
				},
				{ status: configResponse.status },
			);
		}

		// Forward the response from the backend
		const data = await configResponse.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error disabling plugin:", error);
		return NextResponse.json(
			{
				error: "Failed to disable plugin",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
