export function deepEqual(a: unknown, b: unknown): boolean {
	// Convert form values to consistent format
	const normalize = (val: unknown): unknown => {
		// Handle null/undefined consistently
		if (val === null || val === undefined || val === "null") return "";

		// Handle strings and numbers
		if (typeof val === "string") {
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
