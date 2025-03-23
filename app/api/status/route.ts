import { cookies } from "next/headers";

// Define a simple API URL that we'll use to check if the bot is up
const BOT_API_URL = "https://api.rabbittale.co/v1/status";

// Define the status response type
type StatusResponse = {
	version: string;
	healthStatus: {
		bot_status: "working" | "not_working" | "disabled" | "booting_up";
		db_status: {
			status: string;
			error?: string | null;
		};
	};
};

// Create a response indicating the bot is down
function createBotOfflineResponse(): StatusResponse {
	return {
		version: "1.0.0",
		healthStatus: {
			bot_status: "disabled", // Use "disabled" status when bot is off
			db_status: {
				status: "disabled",
				error: "Bot is offline, database unavailable",
			},
		},
	};
}

export async function GET() {
	try {
		// Try to ping the bot with a timeout
		let botIsOnline = false;
		let pingError = null;

		try {
			// Use AbortController to implement a timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

			console.log("[STATUS API] Attempting to ping bot at:", BOT_API_URL);

			const response = await fetch(BOT_API_URL, {
				method: "GET",
				cache: "no-cache",
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			// Log the response status
			console.log("[STATUS API] Bot ping response status:", response.status);

			botIsOnline = response.ok;

			// Try to get response text for debugging
			try {
				const responseText = await response.text();
				console.log(
					"[STATUS API] Bot ping response:",
					responseText || "(empty response)",
				);
			} catch (readError) {
				console.log("[STATUS API] Could not read response body:", readError);
			}
		} catch (error) {
			// Any error means the bot is offline
			pingError = error;
			botIsOnline = false;
			console.log("[STATUS API] Bot ping failed:", error);
		}

		console.log("[STATUS API] Bot online status:", botIsOnline);

		// For testing, force bot to appear online (remove this in production)
		// botIsOnline = true;

		// Prepare the response based on bot status
		const statusData = botIsOnline
			? {
					version: "1.0.0",
					healthStatus: {
						bot_status: "working",
						db_status: {
							status: "working",
						},
					},
				}
			: createBotOfflineResponse();

		console.log(
			"[STATUS API] Returning status data:",
			JSON.stringify(statusData),
		);
		return Response.json(statusData);
	} catch (error) {
		// Even if everything fails, still return a valid response
		console.error("[STATUS API] Unexpected error:", error);
		return Response.json(createBotOfflineResponse());
	}
}
