import { NextResponse } from "next/server";

// Helper function to extract plain text and mentions from HTML content using regex
function extractTextAndMentionsFromHtml(html: string): string {
	// Skip processing if it's not an HTML string
	if (!html || (!html.includes("<div") && !html.includes("<span"))) {
		return html;
	}

	try {
		// Extract text content
		let result = html;

		// Replace HTML tags with their content or appropriate placeholders

		// 1. Replace mention elements with their data-value
		result = result.replace(
			/<span[^>]*?data-type="mention"[^>]*?data-value="([^"]*)"[^>]*?>.*?<\/span>/g,
			"$1",
		);

		// 2. Remove all other HTML tags
		result = result.replace(/<[^>]*>/g, "");

		// 3. Decode HTML entities
		result = result
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&amp;/g, "&")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'");

		return result.trim();
	} catch (error) {
		console.error("Error extracting text from HTML:", error);
		return html; // Return original if parsing fails
	}
}

// Function to recursively process config object
function processConfig<T>(config: T): T {
	if (!config) return config;

	// Handle different types
	if (typeof config === "string") {
		return extractTextAndMentionsFromHtml(config) as unknown as T;
	}

	if (Array.isArray(config)) {
		return config.map((item) => processConfig(item)) as unknown as T;
	}

	if (typeof config === "object" && config !== null) {
		const result: Record<string, unknown> = {};
		for (const key in config as Record<string, unknown>) {
			// Process each property
			result[key] = processConfig((config as Record<string, unknown>)[key]);
		}
		return result as unknown as T;
	}

	return config;
}

// POST endpoint for setting plugin configurations directly
export async function POST(request: Request) {
	try {
		if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
			throw new Error("Backend URL not configured");
		}

		// Get request body
		const body = await request.json();
		const { bot_id, guild_id, plugin_name, config } = body;

		// console.log("Request body:", {
		// 	bot_id: bot_id ? "[PROVIDED]" : "[MISSING]",
		// 	guild_id,
		// 	plugin_name,
		// 	config: config ? "[DATA]" : "[MISSING]",
		// });

		// Validate required fields
		if (!guild_id || !plugin_name) {
			console.error("Missing required fields:", {
				hasGuildId: !!guild_id,
				hasPluginName: !!plugin_name,
			});
			return NextResponse.json(
				{ error: "Missing required fields: guild_id or plugin_name" },
				{ status: 400 },
			);
		}

		// Use default bot ID from environment if not provided
		const finalBotId = bot_id || process.env.NEXT_PUBLIC_BOT_ID;
		if (!finalBotId) {
			console.error("Bot ID missing and not in environment");
			throw new Error(
				"Bot ID not provided and not configured in environment variables",
			);
		}

		// Check if BACKEND_URL is configured correctly
		if (!process.env.NEXT_PUBLIC_BACKEND_URL.includes("http")) {
			console.error(
				"Invalid BACKEND_URL format:",
				process.env.NEXT_PUBLIC_BACKEND_URL,
			);
			throw new Error("Backend URL is not properly formatted");
		}

		// Process the config to extract text and mentions from HTML
		const processedConfig = processConfig(config);

		// For debugging - log examples of specific fields that might contain HTML
		if (config && typeof config === "object") {
			// Look for fields that might contain HTML
			const htmlFields = ["welcome_message", "reward_message", "message"];
			for (const field of htmlFields) {
				if ((config as Record<string, unknown>)[field]) {
					const original = (config as Record<string, unknown>)[field] as string;
					const processed = (processedConfig as Record<string, unknown>)[
						field
					] as string;
					if (original !== processed) {
						// console.log(`Field '${field}' was processed:`, {
						// 	original:
						// 		original.substring(0, 50) + (original.length > 50 ? "..." : ""),
						// 	processed:
						// 		processed.substring(0, 50) +
						// 		(processed.length > 50 ? "..." : ""),
						// });
					}
				}
			}
		}

		// URL for the API endpoint
		const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/plugins/set`;

		console.log("Calling Discord API:", url);
		console.log("Request payload:", {
			bot_id: finalBotId ? "[HIDDEN]" : "[MISSING]",
			guild_id,
			plugin_name,
			config_provided: !!config,
		});

		// Call the Discord API to set the plugin configuration
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					bot_id: finalBotId,
					guild_id,
					plugin_name,
					config: processedConfig, // Use processed config here
				}),
			});

			// console.log(
			// 	"Discord API response status:",
			// 	response.status,
			// 	response.statusText,
			// );

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Plugin set API Error:", {
					status: response.status,
					statusText: response.statusText,
					body: errorText,
					url: url,
				});

				// Special handling for 404 errors
				if (response.status === 404) {
					console.error("404 Not Found Error Details:", {
						triedUrl: url,
						possibleIssue: "API endpoint does not exist or path is incorrect",
						checkBackendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
					});

					return NextResponse.json(
						{
							error: "Discord API endpoint not found (404)",
							message:
								"Please check if the backend URL and API path are correct",
							backendUrlExample:
								"https://api.example.com or https://api.example.com/api",
							url: url,
						},
						{ status: 404 },
					);
				}

				// Try to parse the error text as JSON
				try {
					const errorJson = JSON.parse(errorText);
					return NextResponse.json(
						{
							error: "Discord API returned an error",
							details: errorJson,
							status: response.status,
						},
						{ status: response.status },
					);
				} catch (e) {
					// If parsing fails, return the error text as is
					return NextResponse.json(
						{
							error: "Discord API returned an error",
							message: errorText,
							status: response.status,
						},
						{ status: response.status },
					);
				}
			}

			const data = await response.json();
			// console.log("Plugin configuration set successfully");
			return NextResponse.json(data);
		} catch (fetchError: unknown) {
			console.error("Fetch error when calling Discord API:", fetchError);
			throw new Error(
				`Network error when calling Discord API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
			);
		}
	} catch (error) {
		console.error("Error setting plugin configuration:", error);
		return NextResponse.json(
			{
				error: "Failed to set plugin configuration",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
