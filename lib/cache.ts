const DEFAULT_EXPIRY = 5 * 60 * 1000; // Default 5 minutes

export function getCachedData<T>(key: string, expiryTime?: number): T | null {
	try {
		if (typeof window === "undefined") return null;
		const savedData = localStorage.getItem(key);
		if (!savedData) return null;

		const { data, timestamp } = JSON.parse(savedData);

		// if expiryTime is Infinity, cache never expires
		if (expiryTime === Number.POSITIVE_INFINITY) return data;

		// if the expiry time has passed, remove the cache
		if (Date.now() - timestamp > (expiryTime ?? DEFAULT_EXPIRY)) {
			localStorage.removeItem(key);
			return null;
		}
		return data;
	} catch (e) {
		console.warn(`Failed to get cache for ${key}:`, e);
		return null;
	}
}

export function setCachedData<T>(key: string, data: T) {
	try {
		if (typeof window === "undefined") return;
		localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
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
