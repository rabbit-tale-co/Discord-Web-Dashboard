export function deepEqual(a: unknown, b: unknown): boolean {
	// Specialized function to normalize HTML content from MentionTextarea
	const normalizeHtml = (html: string): string => {
		try {
			// First, let's extract all mention values and the raw text content
			const mentionMatches =
				html.match(
					/<span[^>]*?data-type="mention"[^>]*?data-value="([^"]*)"[^>]*?>/g,
				) || [];
			const mentionValues = mentionMatches.map((match) => {
				const valueMatch = match.match(/data-value="([^"]*)"/);
				return valueMatch ? valueMatch[1] : "";
			});

			// Extract plain text content by removing all HTML tags
			const textContent = html
				.replace(/<[^>]*>/g, "") // Remove all HTML tags
				.replace(/&nbsp;/g, " ") // Replace &nbsp; with spaces
				.replace(/\s{2,}/g, " ") // Normalize multiple spaces
				.trim();

			// Sort mention values to ensure consistent comparison
			mentionValues.sort();

			// Create a simplified representation that focuses on content, not structure
			const contentSignature = {
				text: textContent,
				mentions: mentionValues,
			};

			// Return a string representation of the content signature
			return JSON.stringify(contentSignature);
		} catch (e) {
			console.error("Error normalizing HTML:", e);
			// Fallback to original string if something goes wrong
			return html;
		}
	};

	// Normalize plain text with variable references
	const normalizePlainText = (text: string): string => {
		try {
			// Extract variables like {level}, <@id> (roles), <#id> (channels)
			const mentionMatches = text.match(/(\{[^}]+\}|<@[^>]+>|<#[^>]+>)/g) || [];

			// Remove the matches from the text to get clean text
			let cleanText = text;
			for (const match of mentionMatches) {
				cleanText = cleanText.replace(match, "");
			}

			// Normalize the text
			cleanText = cleanText.replace(/\s{2,}/g, " ").trim();

			// Reconstruct text with proper spacing around mentions
			let normalizedText = "";
			const parts = text.split(/(\{[^}]+\}|<@[^>]+>|<#[^>]+>)/g);
			for (let i = 0; i < parts.length; i++) {
				if (parts[i].match(/^\{[^}]+\}|<@[^>]+>|<#[^>]+>$/)) {
					// This is a mention
					normalizedText += parts[i];
				} else {
					// This is regular text
					normalizedText += parts[i].replace(/\s{2,}/g, " ").trim();
				}

				// Add a space if this isn't the last part and the next part
				// doesn't start with punctuation
				if (
					i < parts.length - 1 &&
					parts[i + 1].length > 0 &&
					!parts[i + 1].match(/^[.,!?;)\]]/)
				) {
					normalizedText += " ";
				}
			}

			// Create a content signature object similar to HTML normalization
			const contentSignature = {
				text: normalizedText.trim(),
				mentions: mentionMatches,
			};

			// Return a string representation of the content signature
			return JSON.stringify(contentSignature);
		} catch (e) {
			console.error("Error normalizing plain text:", e);
			return text;
		}
	};

	// Convert form values to consistent format
	const normalize = (val: unknown): unknown => {
		// Handle null/undefined consistently
		if (val === null || val === undefined || val === "null") return "";

		// Handle strings and numbers
		if (typeof val === "string") {
			// Special handling for HTML content from MentionTextarea
			if (
				val.includes("data-slate-") ||
				val.includes("<span") ||
				val.includes("</span>")
			) {
				return normalizeHtml(val);
			}

			// Special handling for plain text with variable placeholders
			if (val.includes("{") || val.includes("<@") || val.includes("<#")) {
				return normalizePlainText(val);
			}

			const trimmed = val.trim();
			// Only convert to number if it's actually numeric
			if (trimmed !== "" && !Number.isNaN(Number(trimmed))) {
				return Number(trimmed);
			}
			return trimmed; // Keep empty string as empty string
		}

		if (typeof val === "number") {
			return Number.isNaN(val) ? "" : val;
		}

		// Rest of the normalize function stays the same
		if (Array.isArray(val)) {
			// Sort arrays to ensure consistent comparison
			return [...val].map(normalize).sort((x: unknown, y: unknown) => {
				if (
					typeof x === "object" &&
					x !== null &&
					"level" in x &&
					typeof y === "object" &&
					y !== null &&
					"level" in y
				) {
					return (
						(x as { level: number }).level - (y as { level: number }).level
					);
				}
				return 0;
			});
		}
		if (typeof val === "object" && val !== null) {
			const normalized: Record<string, unknown> = {};
			for (const key of Object.keys(val as object).sort()) {
				normalized[key] = normalize((val as Record<string, unknown>)[key]);
			}
			return normalized;
		}
		return val;
	};

	const normalizedA = normalize(a);
	const normalizedB = normalize(b);

	// Add detailed debug logging
	console.log("Normalized values:", {
		original: a,
		normalized_a: normalizedA,
		current: b,
		normalized_b: normalizedB,
		equal: JSON.stringify(normalizedA) === JSON.stringify(normalizedB),
	});

	return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
}
