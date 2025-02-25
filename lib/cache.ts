type TimeUnit = "s" | "m" | "h" | "d" | "y";
type CacheTime = number | `${number}${TimeUnit}`;

function parseCacheTime(time: CacheTime): number {
	if (typeof time === "number") return time;

	const match = time.match(/^(\d+)(s|m|h|d|y)$/);
	if (!match) throw new Error("Invalid time format");

	const [, value, unit] = match;
	const numValue = Number.parseInt(value, 10);

	switch (unit as TimeUnit) {
		case "s":
			return numValue * 1000;
		case "m":
			return numValue * 60 * 1000;
		case "h":
			return numValue * 60 * 60 * 1000;
		case "d":
			return numValue * 24 * 60 * 60 * 1000;
		case "y":
			return numValue * 365 * 24 * 60 * 60 * 1000;
		default:
			throw new Error("Invalid time unit");
	}
}

export interface CachedData<T = unknown> {
	data: T;
	expiresAt: number;
}

export function getCachedData<T>(key: string): CachedData<T> | null {
	try {
		if (typeof window === "undefined") return null;
		const savedData = localStorage.getItem(key);
		if (!savedData) return null;
		const parsed = JSON.parse(savedData) as CachedData<T>;
		return parsed;
	} catch (e) {
		console.warn(`Failed to get cache for ${key}:`, e);
		return null;
	}
}

export function setCachedData<T>(
	key: string,
	data: T,
	expiryTime: CacheTime = "5m",
) {
	try {
		if (typeof window === "undefined") return;
		const expiresAt = Date.now() + parseCacheTime(expiryTime);
		localStorage.setItem(key, JSON.stringify({ data, expiresAt }));
	} catch (e) {
		console.warn(`Failed to set cache for ${key}:`, e);
	}
}

export function clearCache(key: string) {
	try {
		if (typeof window === "undefined") return;
		localStorage.removeItem(key);
	} catch (e) {
		console.warn(`Failed to clear cache for ${key}:`, e);
	}
}
