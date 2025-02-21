const DEFAULT_EXPIRY = 5 * 60 * 1000; // Domyślnie 5 minut

export function getCachedData<T>(key: string, expiryTime?: number): T | null {
	try {
		if (typeof window === "undefined") return null; // Ochrona przed SSR
		const savedData = localStorage.getItem(key);
		if (!savedData) return null;

		const { data, timestamp } = JSON.parse(savedData);

		// Jeśli expiryTime to `Infinity`, cache nigdy nie wygasa
		if (expiryTime === Number.POSITIVE_INFINITY) return data;

		// Jeśli minął czas expiry, usuwamy cache
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
		if (typeof window === "undefined") return; // Ochrona przed SSR
		localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
	} catch (e) {
		console.warn(`Failed to set cache for ${key}:`, e);
	}
}
